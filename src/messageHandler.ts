/** A custom messaging class to handle
 *   `webviewPanel.webview.onDidReceiveMessage` and
 *  `webviewPanel.webview.postMessage`
 */
import type { HostMessage, WebviewMessage } from './types';
import { getMonacoUri } from './utils';
import * as vscode from 'vscode';

export class MessageHandler {
    private _webviewPanel: vscode.WebviewPanel;
    private _document: vscode.TextDocument;
    constructor(
        private readonly context: vscode.ExtensionContext,
        webviewPanel: vscode.WebviewPanel,
        document: vscode.TextDocument
    ) {
        this._webviewPanel = webviewPanel;
        this._document = document;
        this._webview.onDidReceiveMessage(this._handleMessage.bind(this));
    }

    private get _webview() {
        return this._webviewPanel.webview;
    }

    private _sendMessage(message: HostMessage) {
        if (this._webviewPanel.active) {
            this._webview.postMessage(message);
        }
    }

    private _updateDocument(value: any) {
        const edit = new vscode.WorkspaceEdit();
        edit.replace(
            this._document.uri,
            new vscode.Range(0, 0, this._document.lineCount, 0),
            value
        );
        vscode.workspace.applyEdit(edit);
    }

    private async _handleMessage(message: any) {
        const msg: WebviewMessage = message;
        switch (msg.action) {
            case 'ready':
                this._sendMessage({
                    type: 'init',
                    value: {
                        monaco: `${getMonacoUri(this._webview, this.context.extensionUri)}`,
                        flow: this._document.getText()
                    }
                });
                break;
            case 'update':
                this._updateDocument(msg.value);
                break;
            default:
                break;
        }
        // TODO: add upload, run and user input handling
    }
}
