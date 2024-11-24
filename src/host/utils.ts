import * as fs from 'fs-extra';
import * as path from 'path';
import { Uri, Webview } from 'vscode';

export const getNonce = () => {
    let text = '';
    const possible =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

export const getUri = (
    webview: Webview,
    extensionUri: Uri,
    pathList: string[]
) => {
    return webview.asWebviewUri(Uri.joinPath(extensionUri, ...pathList));
};

export const getMonacoUri = (webview: Webview, extensionUri: Uri) => {
    const localPath = path.join(__dirname, '..', 'public', 'vs');
    if (fs.existsSync(localPath)) {
        return getUri(webview, extensionUri, ['public', 'vs']);
    }
    return null;
};
