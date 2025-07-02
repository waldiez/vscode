/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2024 - 2025 Waldiez & contributors
 */
import * as vscode from "vscode";

import { FlowRunner } from "./flow/runner";
import { MessageTransport } from "./messaging";
import { getNonce, getUri } from "./utils";
import { ViewStateHandler } from "./viewStateHandler";

/**
 * Provides a custom editor for Waldiez Flow files.
 */
export class WaldiezEditorProvider implements vscode.CustomTextEditorProvider {
    // View type identifier for the custom editor
    private static readonly viewType = "waldiez.flow";
    private _runner?: FlowRunner;
    private _statusBarItem: vscode.StatusBarItem;

    /**
     * Constructs a new WaldiezEditorProvider instance.
     *
     * @param context - The extension context.
     * @param runner - The FlowRunner instance.
     * @param disposables - Array to store disposables for cleanup.
     */
    constructor(
        private readonly context: vscode.ExtensionContext,
        runner: FlowRunner,
    ) {
        this._runner = runner;

        // Set a callback to handle Python interpreter changes
        this._runner.wrapper.setOnChangePythonInterpreter(this._onChangedPythonInterpreter.bind(this));

        // Initialize the status bar item
        this._statusBarItem = this._initializeStatusBarItem();
        this._statusBarItem.hide(); // Hide until Python is ready

        // Register the custom editor provider
        // check if already registered
        const providerRegistration = vscode.window.registerCustomEditorProvider(
            WaldiezEditorProvider.viewType,
            this,
        );
        context.subscriptions.push(providerRegistration);
    }

    /**
     * Injects the FlowRunner after Python is ready
     */
    public initialize(runner: FlowRunner): void {
        this._runner = runner;

        // Set the interpreter change handler
        this._runner.wrapper.setOnChangePythonInterpreter(this._onChangedPythonInterpreter.bind(this));

        this._updateStatusBarItem();
        this._statusBarItem.show();
    }

    /**
     * Disposes resources when the editor provider is no longer needed.
     */
    dispose() {
        this._statusBarItem.dispose();
    }

    /**
     * Initializes the status bar item for the Python interpreter.
     *
     * @returns A configured StatusBarItem.
     */
    private _initializeStatusBarItem() {
        const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        statusBarItem.command = "python.setInterpreter";
        return statusBarItem;
    }

    /**
     * Resolves a custom text editor for a given document.
     *
     * @param document - The text document to be displayed.
     * @param webviewPanel - The webview panel for the editor.
     * @param _token - A cancellation token.
     */
    public async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken,
    ): Promise<void> {
        // Configure webview options
        const localResourceRoots = [
            vscode.Uri.joinPath(this.context.extensionUri, "dist"),
            vscode.Uri.joinPath(this.context.extensionUri, "public"),
        ];
        if (vscode.workspace.workspaceFolders?.[0]?.uri) {
            localResourceRoots.push(vscode.workspace.workspaceFolders[0].uri);
        }
        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots,
        };

        // Set the HTML content of the webview
        webviewPanel.webview.html = this._getWebviewContent(webviewPanel.webview);

        // Define the callback to run a flow file
        const onRun = (path: vscode.Uri) => {
            if (this._runner) {
                this._runner.run(path, messageTransport);
            }
        };
        const onStop = () => {
            if (this._runner) {
                this._runner.stop();
            } else {
                vscode.window.showWarningMessage("Flow runner not yet initialized. Try again shortly.");
            }
        };
        // Initialize the message transporter
        // for communication between the webview and the extension
        const messageTransport = new MessageTransport(
            this.context,
            webviewPanel,
            document,
            onRun,
            onStop,
            this._showStatusBarItem.bind(this),
        );

        // Set webview panel icon and title
        webviewPanel.iconPath = vscode.Uri.joinPath(this.context.extensionUri, "public", "icon.png");
        webviewPanel.title = "Waldiez";

        // Register a content provider for the text document
        const contentProviderSubscription = vscode.workspace.registerTextDocumentContentProvider("waldiez", {
            provideTextDocumentContent: () => document.getText(),
        });

        const savedDocumentSubscription = vscode.workspace.onDidSaveTextDocument(e => {
            const filePath = e.uri.fsPath;
            messageTransport.sendMessage({
                type: "save_result",
                value: {
                    success: true,
                    message: `File saved successfully at ${filePath}`,
                },
            });
        });

        const viewStateHandler = new ViewStateHandler(
            () => {
                // On visible
                // console.log(`Webview became visible: ${document.uri.toString()}`);
                this._statusBarItem.show();
                messageTransport.onReady();
            },
            () => {
                // On hidden
                // console.log(`Webview became hidden: ${document.uri.toString()}`);
                webviewPanel.webview.postMessage({ action: "dispose" });
                this._statusBarItem.hide();
            },
        );
        // Handle the initial state
        viewStateHandler.handleStateChange(webviewPanel.visible);

        // Listen for view state changes
        const changeViewStateSubscription = webviewPanel.onDidChangeViewState(e => {
            viewStateHandler.handleStateChange(e.webviewPanel.visible);
        });

        // Clean up resources when the webview is closed
        webviewPanel.onDidDispose(() => {
            this._statusBarItem.hide();
            messageTransport.dispose();
            viewStateHandler.dispose();
            savedDocumentSubscription.dispose();
            changeViewStateSubscription.dispose();
            contentProviderSubscription.dispose();
        });

        // Show the status bar item
        this._updateStatusBarItem();
        this._statusBarItem.show();
    }

    /**
     * Generates the HTML content for the webview.
     *
     * @param webview - The webview instance.
     * @returns The HTML string for the webview content.
     */
    private _getWebviewContent(webview: vscode.Webview) {
        const extensionUri = this.context.extensionUri;
        const scriptUri = getUri(webview, extensionUri, ["dist", "main.js"]);
        const stylesUri = getUri(webview, extensionUri, ["dist", "main.css"]);
        const nonce = getNonce();

        // Set content security policy sources
        const scriptSrc = `'nonce-${nonce}' ${webview.cspSource} https://cdn.jsdelivr.net/npm/ https://drag-drop-touch-js.github.io/`;
        // style-src: add 'unsafe-inline' to avoid issue with react-select:
        // https://github.com/JedWatson/react-select/issues/2030
        const styleSrc = `${webview.cspSource} https://cdn.jsdelivr.net/npm/ 'unsafe-inline'`;
        const imgSrc = `${webview.cspSource} data:`;
        const workerSrc = `${webview.cspSource} blob:`;
        const fontSrc = `${webview.cspSource} data:`;
        // allow all for connect-src (to be able to search/load remote flows)
        const connectSrc = "*";
        const cspContent = `default-src 'none'; style-src ${styleSrc}; script-src ${scriptSrc}; img-src ${imgSrc}; worker-src ${workerSrc}; connect-src ${connectSrc}; font-src ${fontSrc}`;
        return `
          <!DOCTYPE html>
          <html lang="en">
            <head>
              <meta charset="UTF-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <meta property="csp-nonce" content="${nonce}" />
              <meta http-equiv="Content-Security-Policy" content="${cspContent}">
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

    /**
     * Handles changes to the Python interpreter.
     *
     * @param _isValid - Whether the selected interpreter is valid.
     */
    private _onChangedPythonInterpreter(_isValid: boolean) {
        if (!_isValid) {
            vscode.window.showWarningMessage("Please select a valid Python interpreter (>=3.10, <3.14)");
            vscode.commands.executeCommand("python.setInterpreter");
        } else {
            this._updateStatusBarItem();
        }
    }

    /**
     * Updates the status bar item with the current Python interpreter details.
     */
    private _updateStatusBarItem() {
        if (this._runner) {
            this._statusBarItem.text = `Python: ${this._runner.wrapper.pythonVersionString()}`;
            this._statusBarItem.tooltip = this._runner.wrapper.executable;
        }
    }

    /**
     * Displays the status bar item.
     */
    private _showStatusBarItem() {
        this._statusBarItem.show();
    }
}
