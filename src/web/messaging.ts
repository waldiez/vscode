import type { HostMessage, WebviewMessage } from '../types';
import type { WebviewApi } from 'vscode-webview';

export class Messaging {
    private readonly vscode: WebviewApi<unknown> | null;
    constructor() {
        if (typeof acquireVsCodeApi === 'function') {
            this.vscode = acquireVsCodeApi();
        } else {
            this.vscode = null;
        }
    }
    public send(message: WebviewMessage) {
        this.vscode?.postMessage(message);
    }
    public listen(callback: (msg: HostMessage) => void) {
        window.addEventListener('message', (e: MessageEvent) => {
            const msg: MessageEvent = e;
            const hostMsg = msg.data as HostMessage;
            switch (hostMsg.type) {
                case 'init':
                    callback(hostMsg);
                    break;
                default:
                    break;
            }
        });
    }
}

export const messaging = new Messaging();
