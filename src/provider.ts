import { MessageHandler } from './messageHandler';
import { getNonce, getUri } from './utils';
import * as vscode from 'vscode';

export class WaldiezEditorProvider implements vscode.CustomTextEditorProvider {
    public static register(
        context: vscode.ExtensionContext
    ): vscode.Disposable {
        const provider = new WaldiezEditorProvider(context);
        const providerRegistration = vscode.window.registerCustomEditorProvider(
            WaldiezEditorProvider.viewType,
            provider
        );
        return providerRegistration;
    }

    private static readonly viewType = 'waldiez.vscode.flow';
    private messageHandlers: Record<string, MessageHandler> = {}; // per document

    constructor(private readonly context: vscode.ExtensionContext) {}

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
        const documentId = document.uri.toString();
        if (!this.messageHandlers[documentId]) {
            this.messageHandlers[documentId] = new MessageHandler(
                this.context,
                webviewPanel,
                document
            );
        }
        webviewPanel.onDidDispose(() => {
            if (this.messageHandlers[documentId]) {
                delete this.messageHandlers[documentId];
            }
        });
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
}
