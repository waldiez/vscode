/** A messaging class to handle
 *  `webviewPanel.webview.onDidReceiveMessage` and
 *  `webviewPanel.webview.postMessage`
 */
import type { HostMessage, UploadRequest, WebviewMessage } from '../types';
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

    private async _handleUpload(message: UploadRequest) {
        const files = message.value;
        //let's also send nulls, to have a fixed length array
        const savedPaths: (string | null)[] = [];
        for (const file of files) {
            const path = await this._saveFileToWorkspace(file);
            savedPaths.push(path);
        }
        this.sendMessage({
            type: 'upload',
            value: savedPaths
        });
    }

    private async _saveFileToWorkspace(file: any) {
        const buffer = Buffer.from(file.content, 'base64');
        const workspaceFolders = vscode.workspace.workspaceFolders;
        // let destination = // relative to this._document.uri
        let destination = vscode.Uri.joinPath(
            this._document.uri,
            '..',
            file.name
        );
        if (workspaceFolders) {
            destination = vscode.Uri.joinPath(
                workspaceFolders[0].uri,
                file.name
            );
        }
        try {
            await vscode.workspace.fs.writeFile(destination, buffer);
            return destination.fsPath;
        } catch (e) {
            console.error('<Waldiez> Error saving file:', e);
            return null;
        }
    }

    private async _handlePrompt(value: any) {
        console.log('<Waldiez> TODO: handle prompt:', value);
    }

    private getInitialText() {
        const text = this._document.getText();
        if (text === '') {
            return '{}';
        }
        return text;
    }
    private async _handleMessage(message: WebviewMessage) {
        if (!message.action || !this._webviewPanel.active) {
            return;
        }
        switch (message.action) {
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
                this._updateDocument(message.value);
                break;
            case 'run':
                this._handleRun(message.value);
                break;
            case 'upload':
                this._handleUpload(message);
                break;
            case 'prompt':
                this._handlePrompt(message.value);
                break;
            default:
                break;
        }
    }
}
