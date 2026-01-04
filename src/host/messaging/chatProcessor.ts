/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2024 - 2026 Waldiez & contributors
 */
import * as vscode from "vscode";

import { WaldiezChatMessage, WaldiezChatMessageProcessor } from "@waldiez/react";

import { traceVerbose } from "../log/logging";
import { MessageProcessor } from "./processor";
import { MessageTransport } from "./transport";

/**
 * MessageProcessor is responsible for processing incoming messages from the Waldiez chat system.
 * It handles raw data, processes individual lines, and manages user input requests.
 */
export class ChatMessageProcessor extends MessageProcessor {
    private _messages: WaldiezChatMessage[] = [];

    /**
     * Creates an instance of MessageProcessor.
     * @param transport - The MessageTransport instance used for communication.
     * @param uploadsRoot - The root URI for uploads, used to construct image URLs.
     */
    constructor(transport: MessageTransport, uploadsRoot: vscode.Uri) {
        super(transport, uploadsRoot, "chat");
    }

    /**
     * Handles a single line of input data.
     * This method processes the line, extracts messages, and handles user input requests.
     * @param line - The line of data to process.
     */
    protected handleLine(line: string) {
        traceVerbose("Processing line:\n", line.slice(0, 300));
        // {uploads_route: "file://path/to/uploads", ...}
        // imageUrlReplacement: file://path/to/uploads/{requestId}.png
        let imageUrlReplacement: string | undefined;
        if (this._requestId) {
            imageUrlReplacement = this.transporter
                .asWebviewUri(vscode.Uri.joinPath(this._uploadsRoot, `${this._requestId}.png`))
                .toString();
        }
        const result = WaldiezChatMessageProcessor.process(line, this._requestId, imageUrlReplacement);
        if (result) {
            /* c8 ignore start */
            // Waldiez lib related
            if (result.timeline) {
                this._onTimelineUpdate(result.timeline);
                return;
            }
            if (result.message) {
                this._messages.push(result.message);
                this._onMessagesUpdate();
            }
            if (result.participants) {
                this._onParticipantsUpdate(result.participants);
                return;
            }
            if (result.message && result.message.type === "input_request" && result.requestId) {
                this._requestId = result.requestId;
                traceVerbose("Input request received:", JSON.stringify(result, null, 2));
                this.askForInput(result.requestId, result.message.prompt, result.message.password || false);
                return;
            }
            /* c8 ignore stop */
        }
    }

    /**
     * Updates the transport with the current messages.
     * This method is called whenever the messages array is updated.
     */
    protected _onMessagesUpdate(): void {
        this._transport.updateMessages(this._messages);
    }
}
