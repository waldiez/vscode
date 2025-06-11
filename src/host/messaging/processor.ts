/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2024 - 2025 Waldiez & contributors
 */
import { Writable } from "stream";
import * as vscode from "vscode";

import { WaldiezChatMessage, WaldiezChatMessageProcessor, WaldiezChatUserInput } from "@waldiez/react";

import { traceError, traceVerbose, traceWarn } from "../log/logging";
import { extractUserResponseContent } from "./shared";
import { MessageTransport } from "./transport";

/**
 * MessageProcessor is responsible for processing incoming messages from the Waldiez chat system.
 * It handles raw data, processes individual lines, and manages user input requests.
 */
export class MessageProcessor {
    private messages: WaldiezChatMessage[] = [];
    private requestId?: string;
    private _stdin: Writable | undefined | null;
    private _transport: MessageTransport;
    private _uploadsRoot: vscode.Uri;

    constructor(transport: MessageTransport, uploadsRoot: vscode.Uri) {
        this._transport = transport;
        this._uploadsRoot = uploadsRoot;
    }

    public set stdin(stream: Writable | undefined | null) {
        this._stdin = stream;
    }

    public get transporter(): MessageTransport {
        return this._transport;
    }

    public handleRawData(data: string) {
        const lines = data.split("\n").filter(line => line.trim());
        if (lines.length === 0) {
            return;
        }

        traceVerbose("Received data:", data);
        for (const line of lines) {
            this._handleLine(line);
        }
    }

    public _handleInputResponse(response: WaldiezChatUserInput | undefined) {
        if (!response || response.request_id !== this.requestId) {
            traceWarn("Mismatched or missing input response");
            return;
        }

        const data = extractUserResponseContent(response.data);
        const obj = {
            type: "input_response",
            request_id: response.request_id,
            data,
        };
        this._stdin?.write(JSON.stringify(obj) + "\n");
    }

    private _handleLine(line: string) {
        traceVerbose("Processing line:\n", line);
        // {uploads_route: "file://path/to/uploads", ...}
        // imageUrlReplacement: file://path/to/uploads/{requestId}.png
        let imageUrlReplacement: string | undefined;
        if (this.requestId) {
            imageUrlReplacement = this.transporter
                .asWebviewUri(vscode.Uri.joinPath(this._uploadsRoot, `${this.requestId}.png`))
                .toString();
        }
        // const imageUrlReplacement = this._getImageUrlReplacement(line);
        const result = WaldiezChatMessageProcessor.process(line, this.requestId, imageUrlReplacement);
        if (result) {
            if (result.message) {
                this.messages.push(result.message);
                this._onMessagesUpdate();
            }
            if (result.participants && result.participants.users) {
                // this.userParticipants = result.participants.users;
                this._transport.updateParticipants(result.participants.users);
            }
            if (result.message && result.message.type === "input_request" && result.requestId) {
                this.requestId = result.requestId;
                traceVerbose("Input request received:", JSON.stringify(result, null, 2));
                this._transport
                    .askForInput({
                        request_id: result.requestId,
                        prompt: result.message.prompt,
                        password: result.message.password ?? false,
                    })
                    .then(response => {
                        if (!response) {
                            traceWarn("No response received for input request:", result.requestId);
                            this._stdin?.write("\n");
                            return;
                        }
                        traceVerbose("Input response received:", response);
                        this._handleInputResponse(response);
                    })
                    .catch(err => {
                        traceError("Error handling input request:", err);
                        this._stdin?.write("\n");
                    });
            }
        }
    }

    private _onMessagesUpdate(): void {
        this._transport.updateMessages(this.messages);
    }
}
