/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2024 - 2025 Waldiez & contributors
 */
import * as vscode from "vscode";

import { WaldiezChatUserInput, WaldiezTimelineData } from "@waldiez/react";

import type { HostMessage, UploadRequest, WebviewMessage } from "../../types";
import { CONVERT_TO_IPYNB, CONVERT_TO_PYTHON, TIME_TO_WAIT_FOR_INPUT } from "../constants";
import { traceError, traceVerbose } from "../log/logging";

export class MessageTransport {
    private _disposable: vscode.Disposable;
    private _inputPromise: Promise<WaldiezChatUserInput | undefined> | null = null;
    private _inputResolve: ((value: WaldiezChatUserInput | undefined) => void) | null = null;
    private _messages: any[] = [];

    private _webview: vscode.Webview;
    // private _instanceId: string; // Add instance ID for debugging

    // Locking mechanisms
    private _messageLocks = new Set<string>();
    private _pendingMessages = new Map<string, HostMessage>();
    private _messageSequence = 0;
    private _lastSentMessageHashes = new Set<string>();
    private _lastMessageTimestamps = new Map<string, number>();

    // Debouncing for specific message types
    private _debounceTimeouts = new Map<string, NodeJS.Timeout>();

    constructor(
        private readonly panel: vscode.WebviewPanel,
        private readonly document: vscode.TextDocument,
        private readonly onRun: (uri: vscode.Uri) => void,
        private readonly onStop: () => void,
        private readonly onInit: () => void,
    ) {
        this._webview = panel.webview;
        // this._instanceId = Math.random().toString(36).substring(2, 10);
        this._disposable = this._webview.onDidReceiveMessage(this._handleMessage.bind(this));

        // traceVerbose(`<Waldiez> MessageTransport ${this._instanceId} created for ${document.uri.toString()}`);
    }

    public asWebviewUri(uri: vscode.Uri): vscode.Uri {
        return this.panel.webview.asWebviewUri(uri);
    }

    public dispose() {
        this._disposable.dispose();
        // Clear all timeouts
        this._debounceTimeouts.forEach(timeout => clearTimeout(timeout));
        this._debounceTimeouts.clear();

        // Clear all locks and state when disposing
        this._messageLocks.clear();
        this._pendingMessages.clear();
        this._lastSentMessageHashes.clear();
        this._lastMessageTimestamps.clear();

        // traceVerbose(`<Waldiez> MessageTransport ${this._instanceId} disposed, cleared all locks and state`);
    }

    // eslint-disable-next-line max-statements
    public sendMessage(
        message: HostMessage,
        options?: {
            skipDuplicates?: boolean;
            debounceMs?: number;
            lockKey?: string;
            allowReInit?: boolean; // New option for re-initialization
        },
    ) {
        if (!this.panel.active) {
            return;
        }

        const { skipDuplicates = true, debounceMs = 50, lockKey, allowReInit = false } = options || {};

        // Generate a unique key for this message type/content
        const messageKey = lockKey || this._getMessageKey(message);

        // Special handling for re-initialization messages
        if (allowReInit && message.type === "init") {
            const lastInitTime = this._lastMessageTimestamps.get("init") || 0;
            const now = Date.now();

            // Allow re-init if it's been more than 1 second since last init
            if (now - lastInitTime > 1000) {
                this._lastMessageTimestamps.set("init", now);
                // Clear any existing locks/hashes for init messages
                this._messageLocks.delete(messageKey);
                const initHashes = Array.from(this._lastSentMessageHashes).filter(hash =>
                    hash.includes("init"),
                );
                initHashes.forEach(hash => this._lastSentMessageHashes.delete(hash));
            }
        }

        // Skip duplicates if requested
        if (skipDuplicates && !allowReInit) {
            const messageHash = this._hashMessage(message);
            if (this._lastSentMessageHashes.has(messageHash)) {
                return;
            }
            this._lastSentMessageHashes.add(messageHash);
        }

        // Use debouncing if specified
        if (debounceMs > 0) {
            this._sendMessageDebounced(message, messageKey, debounceMs);
            return;
        }

        // Use locking mechanism
        if (this._messageLocks.has(messageKey)) {
            // traceVerbose(`<Waldiez> Message ${messageKey} is locked, queuing...`);
            this._pendingMessages.set(messageKey, message);
            return;
        }

        this._sendMessageWithLock(message, messageKey);
    }

    private _sendMessageWithLock(message: HostMessage, lockKey: string) {
        this._messageLocks.add(lockKey);

        try {
            // noinspection JSIgnoredPromiseFromCall
            this._webview.postMessage(message);
            // traceVerbose(`<Waldiez> Sent message: ${lockKey}`);
        } finally {
            // Release lock after a short delay to prevent immediate re-sending
            setTimeout(() => {
                this._messageLocks.delete(lockKey);

                // Send any pending message for this key
                const pendingMessage = this._pendingMessages.get(lockKey);
                if (pendingMessage) {
                    this._pendingMessages.delete(lockKey);
                    this._sendMessageWithLock(pendingMessage, lockKey);
                }
            }, 50);
        }
    }

    private _sendMessageDebounced(message: HostMessage, messageKey: string, debounceMs: number) {
        // Clear existing timeout for this message type
        const existingTimeout = this._debounceTimeouts.get(messageKey);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
        }

        // Set new timeout
        const timeout = setTimeout(() => {
            // noinspection JSIgnoredPromiseFromCall
            this._webview.postMessage(message);
            this._debounceTimeouts.delete(messageKey);
            // traceVerbose(`<Waldiez> Sent debounced message: ${messageKey}`);
        }, debounceMs);

        this._debounceTimeouts.set(messageKey, timeout);
    }

    private _getMessageKey(message: HostMessage): string {
        // Create a unique key based on message type and relevant content
        switch (message.type) {
            case "input_request":
                return `input_request_${message.value?.request_id || "default"}`;
            case "messages_update":
                return "messages_update";
            case "init":
                return "init";
            case "update":
                return "update";
            default:
                return `${message.type}_${this._messageSequence++}`;
        }
    }

    private _hashMessage(message: HostMessage): string {
        // For init messages, include timestamp to allow re-initialization
        // but still prevent rapid duplicates within a short timeframe
        let content = JSON.stringify(message);
        if (message.type === "init") {
            // Round timestamp to nearest 5 seconds to allow re-init but prevent spam
            const roundedTimestamp = Math.floor(Date.now() / 5000) * 5000;
            content += `_${roundedTimestamp}`;
        }

        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }

    private _operationPromises = new Map<string, Promise<void>>();

    // noinspection JSUnusedGlobalSymbols
    public async sendMessageSafe(message: HostMessage, operationKey?: string): Promise<void> {
        const key = operationKey || this._getMessageKey(message);

        // Wait for any existing operation with the same key
        const existingPromise = this._operationPromises.get(key);
        if (existingPromise) {
            await existingPromise;
        }

        // Create new operation promise
        const operationPromise = this._performMessageSend(message, key);
        this._operationPromises.set(key, operationPromise);

        try {
            await operationPromise;
        } finally {
            this._operationPromises.delete(key);
        }
    }

    private async _performMessageSend(message: HostMessage, _key: string): Promise<void> {
        // noinspection TypeScriptUMDGlobal
        return new Promise(resolve => {
            if (this.panel.active) {
                this._webview.postMessage(message);
                // traceVerbose(`<Waldiez> Sent safe message: ${key}`);
            }
            // Small delay to prevent immediate re-sending
            setTimeout(resolve, 10);
        });
    }

    // Updated methods using the new sending mechanisms
    public updateMessages(messages: any[]) {
        this._messages = messages;
        this.sendMessage(
            {
                type: "messages_update",
                value: this._messages,
            },
            { debounceMs: 100 }, // Override default for longer debounce
        );
    }

    public updateTimeline(timeline: WaldiezTimelineData | undefined) {
        this.sendMessage(
            {
                type: "timeline_update",
                value: timeline,
            },
            { skipDuplicates: false }, // Override default for longer debounce
        );
    }

    public updateParticipants(participants: string[]) {
        this.sendMessage(
            {
                type: "participants_update",
                value: participants,
            },
            { skipDuplicates: false }, // Override default for longer debounce
        );
    }

    /**
     * Sends a message indicating the workflow has ended.
     * @param code - The exit code of the workflow.
     * @param message - Optional message to display upon completion.
     * Defaults to "Workflow execution completed".
     */
    public onWorkflowEnd(code: number, message: string = "Workflow execution completed"): void {
        this.sendMessage(
            { type: "workflow_end", value: { success: code === 0, message } },
            {
                skipDuplicates: false,
                debounceMs: 100,
            },
        );
    }

    public askForInput({
        request_id,
        prompt,
        password = false,
    }: {
        request_id: string;
        prompt: string;
        password?: boolean;
    }): Promise<WaldiezChatUserInput | undefined> {
        // Use lock key to prevent duplicate input requests
        this.sendMessage(
            {
                type: "input_request",
                value: { request_id, prompt, password },
            },
            { lockKey: `input_request_${request_id}`, debounceMs: 0 }, // No delay for input requests
        );

        // noinspection TypeScriptUMDGlobal
        this._inputPromise = new Promise(resolve => {
            const timeout = setTimeout(() => {
                resolve(undefined);
                this._inputPromise = null;
                this._inputResolve = null;
            }, TIME_TO_WAIT_FOR_INPUT);

            this._inputResolve = value => {
                clearTimeout(timeout);
                resolve(value);
                this._inputPromise = null;
                this._inputResolve = null;
            };
        });

        return this._inputPromise;
    }

    private _handleInputResponse(value: WaldiezChatUserInput) {
        if (this._inputResolve) {
            this._inputResolve(value);
        }
    }

    private _getInitialText(): string {
        const text = this.document.getText();
        return text === "" ? '{"type": "flow", "data": {}}' : text;
    }

    private async _handleUpload(message: UploadRequest) {
        const files = message.value;
        const saved: (string | null)[] = [];

        for (const file of files) {
            const result = await this._saveFile(file);
            saved.push(result);
        }

        this.sendMessage({ type: "upload", value: saved });
    }

    private async _saveFile(file: any): Promise<string | null> {
        const buffer = Buffer.from(file.content, "base64");
        const scheme = this.document.uri.scheme;

        let dest = vscode.Uri.joinPath(this.document.uri, "..", file.name);
        if (scheme !== "file" && vscode.workspace.workspaceFolders) {
            dest = vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, file.name);
        }

        // traceVerbose("<Waldiez> Saving file to:", dest.fsPath);
        try {
            await vscode.workspace.fs.writeFile(dest, buffer);
            vscode.commands.executeCommand("workbench.files.action.refreshFilesExplorer");
            this.sendMessage({
                type: "save_result",
                value: {
                    success: true,
                    message: `File saved successfully at ${dest.fsPath}`,
                },
            });
            return dest.fsPath;
        } catch (e) {
            traceError("<Waldiez> Error saving file:", e);
            this.sendMessage({
                type: "save_result",
                value: {
                    success: false,
                    message: `Error saving file: ${(e as Error).message}`,
                },
            });
            return null;
        }
    }

    private async _handleMessage(message: WebviewMessage): Promise<void> {
        if (!message.action || !this.panel.active) {
            return;
        }

        switch (message.action) {
            case "ready":
                this.onReady();
                break;

            case "initialized":
                this.onInit();
                break;

            case "change":
                this.updateDocument(message.value);
                break;

            case "run":
                this.updateDocument(message.value);
                await vscode.workspace.save(this.document.uri);
                this.onRun(this.document.uri);
                break;

            case "stop_request":
                this.onStop();
                break;

            case "upload":
                await this._handleUpload(message);
                break;

            case "input_response":
                this._handleInputResponse(message.value);
                break;

            case "save":
                this.updateDocument(message.value);
                break;
            case "convert":
                this.onConvert(message.value);
                break;
            default:
                traceVerbose("<Waldiez> Unknown webview message:", message);
                break;
        }
    }

    public onReady() {
        // traceVerbose(
        //     `<Waldiez> Instance ${this._instanceId}: onReady() called for ${this.document.uri.toString()}`,
        // );
        this.sendMessage(
            {
                type: "init",
                value: {
                    monaco: "",
                    flow: this._getInitialText(),
                },
            },
            {
                lockKey: "init_message",
                debounceMs: 100,
                allowReInit: true, // Allow legitimate re-initialization
            },
        );
    }

    public updateDocument(content: string) {
        const currentText = this.document.getText();
        if (currentText === content) {
            // No change needed
            return;
        }
        const edit = new vscode.WorkspaceEdit();
        const fullRange = new vscode.Range(0, 0, this.document.lineCount, 0);
        edit.replace(this.document.uri, fullRange, content);
        // noinspection JSIgnoredPromiseFromCall
        vscode.workspace.applyEdit(edit);

        // Use debounced sending for update messages
        this.sendMessage({ type: "update", value: content }, { debounceMs: 50, skipDuplicates: true });
    }

    public onConvert(value: { flow: string; to: "py" | "ipynb" }) {
        // call the registered command to convert the flow
        const command = value.to === "py" ? CONVERT_TO_PYTHON : CONVERT_TO_IPYNB;
        // noinspection JSIgnoredPromiseFromCall
        vscode.commands.executeCommand(command, this.document.uri, value.flow);
    }
}
