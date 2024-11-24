import { MessageHandler } from './messaging';
import { FlowRunner } from './tools';
import { getNonce, getUri } from './utils';
import * as vscode from 'vscode';

export class WaldiezEditorProvider implements vscode.CustomTextEditorProvider {
    private static readonly viewType = 'waldiez.flow';
    // handle running the flow
    private _runner: FlowRunner;
    private _statusBarItem: vscode.StatusBarItem;

    constructor(
        private readonly context: vscode.ExtensionContext,
        runner: FlowRunner,
        disposables: vscode.Disposable[]
    ) {
        this._runner = runner;
        this._runner.wrapper.setOnChangePythonInterpreter(
            this._onChangedPythonInterpreter.bind(this)
        );
        this._statusBarItem = this._initializeStatusBarItem();
        const registration = vscode.window.registerCustomEditorProvider(
            WaldiezEditorProvider.viewType,
            this
        );
        disposables.push(registration);
        disposables.push(this._statusBarItem);
    }
    dispose() {
        this._statusBarItem.dispose();
    }
    private _initializeStatusBarItem() {
        const statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        statusBarItem.command = 'python.setInterpreter';
        return statusBarItem;
    }
    public async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken
    ): Promise<void> {
        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this.context.extensionUri, 'dist'),
                vscode.Uri.joinPath(this.context.extensionUri, 'public')
            ]
        };
        webviewPanel.webview.html = this._getWebviewContent(
            webviewPanel.webview
        );
        const messageHandler = new MessageHandler(
            this.context,
            webviewPanel,
            document,
            this.onRun.bind(this),
            this._showStatusBarItem.bind(this)
        );
        webviewPanel.iconPath = vscode.Uri.joinPath(
            this.context.extensionUri,
            'public',
            'icon.png'
        );
        webviewPanel.title = 'Waldiez';
        const contentProviderSubscription =
            vscode.workspace.registerTextDocumentContentProvider('waldiez', {
                provideTextDocumentContent: () => document.getText()
            });
        // still, having the same file open in multiple editors
        // does not seem to sync the content between them :(
        const changeDocumentSubscription =
            vscode.workspace.onDidChangeTextDocument(e => {
                if (
                    e.document.uri.toString() === document.uri.toString() &&
                    !webviewPanel.active
                ) {
                    // if active, the change is already handled
                    messageHandler.sendMessage({
                        type: 'update',
                        value: e.document.getText()
                    });
                }
            });
        const changeViewStateSubscription = webviewPanel.onDidChangeViewState(
            e => {
                if (e.webviewPanel.visible) {
                    this._statusBarItem.show();
                } else {
                    this._statusBarItem.hide();
                }
            }
        );
        webviewPanel.onDidDispose(() => {
            this._statusBarItem.hide();
            messageHandler.dispose();
            changeViewStateSubscription.dispose();
            changeDocumentSubscription.dispose();
            contentProviderSubscription.dispose();
        });
        this._updateStatusBarItem();
        this._statusBarItem.show();
    }
    private onRun(path: vscode.Uri) {
        this._runner.run(path);
    }
    private _getWebviewContent(webview: vscode.Webview) {
        const extensionUri = this.context.extensionUri;
        const scriptUri = getUri(webview, extensionUri, ['dist', 'main.js']);
        const stylesUri = getUri(webview, extensionUri, ['dist', 'main.css']);
        const nonce = getNonce();
        const scriptSrc = `'nonce-${nonce}' ${webview.cspSource}`;
        // to avoid issue with react-select:
        // https://github.com/JedWatson/react-select/issues/2030
        const styleSrc = `${webview.cspSource} 'unsafe-inline'`;
        const imgSrc = `${webview.cspSource} data:`;
        const workerSrc = "'self' blob:";
        return /*html*/ `
          <!DOCTYPE html>
          <html lang="en">
            <head>
              <meta charset="UTF-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <meta property="csp-nonce" content="${nonce}" />
              <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${styleSrc}; script-src ${scriptSrc}; img-src ${imgSrc}; worker-src ${workerSrc}; connect-src 'self';">
              <link rel="stylesheet" type="text/css" href="${stylesUri}">
              <title>Waldiez</title>
            </head>
            <body>
              <div id="root"></div>
              <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
          </html>
        `;
    }
    private _onChangedPythonInterpreter(_isValid: boolean) {
        if (!_isValid) {
            vscode.window.showWarningMessage(
                'Please select a valid Python interpreter (>=3.10, <3.13)'
            );
            vscode.commands.executeCommand('python.setInterpreter');
        } else {
            this._updateStatusBarItem();
        }
    }
    private _updateStatusBarItem() {
        this._statusBarItem.text = `Python: ${this._runner.wrapper.pythonVersionString()}`;
        this._statusBarItem.tooltip = this._runner.wrapper.executable;
    }
    private _showStatusBarItem() {
        this._statusBarItem.show();
    }
}
