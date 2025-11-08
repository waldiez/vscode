/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2024 - 2025 Waldiez & contributors
 */
import type { WebviewApi } from "vscode-webview";

import type { HostMessage, HostResponse, WebviewMessage, WebviewRequest } from "../types";

const isHostResponse = (m: unknown): m is HostResponse =>
    !!m && typeof m === "object" && (m as any).type === "response";

export class Messaging {
    private readonly vscode: WebviewApi<unknown> | null;
    private _addedListener: boolean = false;
    private _onMessageCallback?: (msg: HostMessage) => void;
    private pending = new Map<
        string,
        {
            resolve: (value: unknown) => void;
            reject: (reason?: unknown) => void;
            timer?: number;
        }
    >();
    private reqCounter = 0;
    constructor() {
        if (typeof acquireVsCodeApi === "function") {
            this.vscode = acquireVsCodeApi();
        } else {
            this.vscode = null;
        }
    }
    /**
     * Send a request and await the host's response.
     * @param name action name
     * @param channel channel name
     * @param payload serializable payload
     * @param timeoutMs reject if no response within this window (default 15s)
     */
    public sendRequest<TPayload = unknown, TResponse = unknown>(
        type: string,
        channel: string,
        payload?: TPayload,
        timeoutMs = 15_000,
    ): Promise<TResponse> {
        if (!this.vscode) {
            return Promise.reject(new Error("VS Code API not available in this context"));
        }

        const reqId = `${Date.now()}-${this.reqCounter++}`;

        const msg: WebviewRequest<TPayload> = {
            action: "request",
            type,
            channel,
            reqId,
            payload: payload as TPayload,
        };

        return new Promise<TResponse>((resolve, reject) => {
            let timer: number | undefined;
            if (timeoutMs > 0) {
                // setTimeout returns number in browsers
                timer = window.setTimeout(() => {
                    this.pending.delete(reqId);
                    reject(new Error(`Request "${name}" timed out after ${timeoutMs} ms (reqId=${reqId})`));
                }, timeoutMs);
            }

            this.pending.set(reqId, {
                resolve: (v: unknown) => {
                    if (timer !== undefined) {
                        window.clearTimeout(timer);
                    }
                    resolve(v as TResponse);
                },
                reject: (err?: unknown) => {
                    if (timer !== undefined) {
                        window.clearTimeout(timer);
                    }
                    reject(err);
                },
                timer,
            });

            this.vscode?.postMessage(msg);
        });
    }
    public send(message: WebviewMessage) {
        this.vscode?.postMessage(message);
    }
    public setMessageHandler(handler: (msg: HostMessage) => void) {
        this._onMessageCallback = handler;
    }
    private handleMessageEvent(evt: MessageEvent) {
        const msg = evt.data as HostMessage;
        if (isHostResponse(msg)) {
            const pending = this.pending.get(msg.reqId);
            if (!pending) {
                return;
            }
            this.pending.delete(msg.reqId);
            if (msg.success) {
                pending.resolve((msg as Extract<HostResponse, { success: true }>).data);
            } else {
                pending.reject(new Error((msg as Extract<HostResponse, { success: false }>).error));
            }
            return;
        }
        if (!this._onMessageCallback) {
            console.error("No message callback set");
            return;
        }
        this._onMessageCallback(msg);
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
    public dispose(reason = "disposed") {
        for (const [id, entry] of this.pending) {
            if (entry.timer !== undefined) {
                window.clearTimeout(entry.timer);
            }
            entry.reject(new Error(`Request ${id} cancelled: ${reason}`));
        }
        this.pending.clear();
        this.stopListening();
    }
}

export const messaging = new Messaging();
