import type { HostMessage, WebviewMessage } from '../types';
import type { WebviewApi } from 'vscode-webview';

export class Messaging {
    private readonly vscode: WebviewApi<unknown> | null;
    private _onMessageCallback?: (msg: HostMessage) => void;
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
    public setMessageHandler(handler: (msg: HostMessage) => void) {
        this._onMessageCallback = handler;
    }
    private handleMessageEvent(msg: MessageEvent) {
        const hostMsg = msg.data as HostMessage;
        if (!this._onMessageCallback) {
            console.error('No message callback set');
            return;
        }
        switch (hostMsg.type) {
            case 'init':
                this._onMessageCallback(hostMsg);
                break;
            default:
                break;
        }
    }
    public listen() {
        window.addEventListener('message', this.handleMessageEvent.bind(this));
    }
    public stopListening() {
        window.removeEventListener(
            'message',
            this.handleMessageEvent.bind(this)
        );
    }
    public setState(state: Record<string, unknown>) {
        this.vscode?.setState(state);
    }
    public getState() {
        return this.vscode?.getState();
    }
}

export const messaging = new Messaging();
