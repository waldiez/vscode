/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2024 - 2025 Waldiez & contributors
 */
import type { WebviewApi } from "vscode-webview";

import type { HostMessage, WebviewMessage } from "../types";

export class Messaging {
    private readonly vscode: WebviewApi<unknown> | null;
    private _addedListener: boolean = false;
    private _onMessageCallback?: (msg: HostMessage) => void;
    constructor() {
        if (typeof acquireVsCodeApi === "function") {
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
            console.error("No message callback set");
            return;
        }
        this._onMessageCallback(hostMsg);
    }
    public listen() {
        if (!this._addedListener) {
            window.addEventListener("message", this.handleMessageEvent.bind(this));
            this._addedListener = true;
        }
    }
    public stopListening() {
        window.removeEventListener("message", this.handleMessageEvent.bind(this));
        this._addedListener = false;
    }
    // noinspection JSUnusedGlobalSymbols
    public setState(state: Record<string, unknown>) {
        this.vscode?.setState(state);
    }
    // noinspection JSUnusedGlobalSymbols
    public getState() {
        return this.vscode?.getState();
    }
}

export const messaging = new Messaging();
