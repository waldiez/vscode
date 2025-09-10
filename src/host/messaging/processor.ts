/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2024 - 2025 Waldiez & contributors
 */
import { Writable } from "stream";
import * as vscode from "vscode";

import {
    WaldiezChatMessage,
    WaldiezChatMessageProcessor,
    WaldiezChatUserInput,
    WaldiezTimelineData,
} from "@waldiez/react";

import { traceError, traceInfo, traceVerbose, traceWarn } from "../log/logging";
import { MessageTransport } from "./transport";

/**
 * MessageProcessor is responsible for processing incoming messages from the Waldiez chat system.
 * It handles raw data, processes individual lines, and manages user input requests.
 */
export class MessageProcessor {
    private messages: WaldiezChatMessage[] = [];
    private requestId?: string;
    private _stdin: Writable | undefined | null;
    private readonly _transport: MessageTransport;
    private _uploadsRoot: vscode.Uri;

    /**
     * Creates an instance of MessageProcessor.
     * @param transport - The MessageTransport instance used for communication.
     * @param uploadsRoot - The root URI for uploads, used to construct image URLs.
     */
    constructor(transport: MessageTransport, uploadsRoot: vscode.Uri) {
        this._transport = transport;
        this._uploadsRoot = uploadsRoot;
    }

    /**
     * Sets the stdin stream.
     * This method allows the processor to write messages to the stdin stream.
     * @param stream - The writable stream to use as stdin.
     */
    public set stdin(stream: Writable | undefined | null) {
        this._stdin = stream;
    }

    /**
     * Gets the transporter instance.
     * This method returns the MessageTransport instance used by this processor.
     * @returns The MessageTransport instance.
     */
    public get transporter(): MessageTransport {
        return this._transport;
    }

    /**
     * Handles raw data input.
     * This method processes raw data and extracts messages or user input requests.
     * @param data - The raw data to process.
     */

    /**
     * Handles JSON output.
     * @param obj - The JSON object to handle.
     */
    public handleJson(obj: any) {
        // Process the JSON object
        this._handleLine(JSON.stringify(obj));
    }

    /**
     * Handles fallback output.
     * @param text - The raw line of data to handle.
     */
    public handleText(text: string) {
        if (text.includes("<Waldiez> - Workflow finished")) {
            traceInfo("Workflow finished");
            return;
        }
        this._handleLine(text);
    }

    /**
     * Handles user input responses.
     * This method processes the response from the user input request and writes it to the stdin stream.
     * @param response - The user input response to handle.
     */
    public _handleInputResponse(response: WaldiezChatUserInput | undefined) {
        if (!response || response.request_id !== this.requestId) {
            traceWarn("Mismatched or missing input response");
            return;
        }
        const data = this._extractUserResponseContent(response.data);
        const obj = {
            type: "input_response",
            request_id: response.request_id,
            data,
        };
        this._stdin?.write(JSON.stringify(obj) + "\n");
    }

    /**
     * Handles a single line of input data.
     * This method processes the line, extracts messages, and handles user input requests.
     * @param line - The line of data to process.
     */
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
            /* c8 ignore start */
            // Waldiez lib related
            if (result.timeline) {
                this._onTimelineUpdate(result.timeline);
                return;
            }
            if (result.message) {
                this.messages.push(result.message);
                this._onMessagesUpdate();
            }
            if (result.participants && result.participants) {
                // this.userParticipants = result.participants.users;
                this._transport.updateParticipants(
                    result.participants.filter(participant => participant.isUser),
                );
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
            /* c8 ignore stop */
        }
    }

    /**
     * Updates the transport with the current messages.
     * This method is called whenever the messages array is updated.
     */
    private _onMessagesUpdate(): void {
        this._transport.updateMessages(this.messages);
    }

    /**
     * Updates the transport with the current timeline.
     * This method is called whenever the timeline is updated.
     * @param timeline - The updated timeline data.
     */
    private _onTimelineUpdate(timeline: WaldiezTimelineData): void {
        this._transport.updateTimeline(timeline);
    }

    private _extractUserResponseContent = (data: any): any => {
        if (typeof data === "string") {
            try {
                return this._extractUserResponseContent(JSON.parse(data));
            } catch {
                return data;
            }
        }

        if (Array.isArray(data)) {
            if (data.length === 1 && data[0]?.content) {
                return data[0].content;
            }
            return data.map(item => {
                if (typeof item === "string") {
                    try {
                        return JSON.parse(item);
                    } catch {
                        return item;
                    }
                }
                return item;
            });
        }

        if (typeof data === "object" && data !== null) {
            if ("content" in data) {
                return data.content;
            }
            return data;
        }

        return data;
    };
}
