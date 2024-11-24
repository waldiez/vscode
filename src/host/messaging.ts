/** A messaging class to handle
 *  `webviewPanel.webview.onDidReceiveMessage` and
 *  `webviewPanel.webview.postMessage`
 */
import type { HostMessage, WebviewMessage } from '../types';
import { getMonacoUri } from './utils';
import * as vscode from 'vscode';

export class MessageHandler {
    private _webviewPanel: vscode.WebviewPanel;
    private _document: vscode.TextDocument;
    private _disposable: vscode.Disposable;
    private _onRun: (path: vscode.Uri) => void;
    private _onInit: () => void;

    constructor(
        private readonly context: vscode.ExtensionContext,
        webviewPanel: vscode.WebviewPanel,
        document: vscode.TextDocument,
        onRun: (path: vscode.Uri) => void,
        onInit: () => void
    ) {
        this._webviewPanel = webviewPanel;
        this._document = document;
        this._disposable = this._webview.onDidReceiveMessage(
            this._handleMessage.bind(this)
        );
        this._onRun = onRun;
        this._onInit = onInit;
    }

    public dispose() {
        this._disposable.dispose();
    }
    private get _webview() {
        return this._webviewPanel.webview;
    }

    public sendMessage(message: HostMessage) {
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

    private async _handleRun(value: any) {
        this._updateDocument(value);
        vscode.workspace.save(this._document.uri);
        this._onRun(this._document.uri);
    }

    private async _handleMessage(message: any) {
        const msg: WebviewMessage = message;
        if (!msg.action || !this._webviewPanel.active) {
            return;
        }
        switch (msg.action) {
            case 'ready':
                this.sendMessage({
                    type: 'init',
                    value: {
                        monaco: `${getMonacoUri(this._webview, this.context.extensionUri)}`,
                        flow: this._document.getText()
                    }
                });
                this._onInit();
                break;
            case 'change':
                this._updateDocument(msg.value);
                break;
            case 'run':
                this._handleRun(msg.value);
                break;
            default:
                break;
        }
        // TODO: add upload, run and user input handling
    }
}
