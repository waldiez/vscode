/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2024 - 2025 Waldiez & contributors
 */
import * as vscode from "vscode";

import {
    WaldiezChatMessage,
    WaldiezChatMessageProcessor,
    WaldiezChatUserInput,
    WaldiezTimelineData,
} from "@waldiez/react";

import { traceError, traceInfo, traceVerbose, traceWarn } from "../log/logging";
import { MessageProcessor } from "./processor";

/**
 * MessageProcessor is responsible for processing incoming messages from the Waldiez chat system.
 * It handles raw data, processes individual lines, and manages user input requests.
 */
export class ChatMessageProcessor extends MessageProcessor {
    private _messages: WaldiezChatMessage[] = [];

    /**
     * Handles JSON output.
     * @param obj - The JSON object to handle.
     */
    public handleJson(obj: any) {
        // Process the JSON object
        this.handleLine(JSON.stringify(obj));
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
        this.handleLine(text);
    }
    /**
     * Handles user input responses.
     * This method processes the response from the user input request and writes it to the stdin stream.
     * @param response - The user input response to handle.
     */
    public handleInputResponse(userInput: WaldiezChatUserInput | undefined) {
        if (!userInput || userInput.request_id !== this._requestId) {
            traceWarn("Mismatched or missing input response");
            return;
        }
        const data = this._extractUserResponseContent(userInput.data);
        const obj = {
            type: "input_response",
            request_id: userInput.request_id,
            data,
        };
        this._stdin?.write(JSON.stringify(obj) + "\n");
    }

    /**
     * Handles a single line of input data.
     * This method processes the line, extracts messages, and handles user input requests.
     * @param line - The line of data to process.
     */
    protected handleLine(line: string) {
        traceVerbose("Processing line:\n", line);
        // {uploads_route: "file://path/to/uploads", ...}
        // imageUrlReplacement: file://path/to/uploads/{requestId}.png
        let imageUrlReplacement: string | undefined;
        if (this._requestId) {
            imageUrlReplacement = this.transporter
                .asWebviewUri(vscode.Uri.joinPath(this._uploadsRoot, `${this._requestId}.png`))
                .toString();
        }
        // const imageUrlReplacement = this._getImageUrlReplacement(line);
        const result = WaldiezChatMessageProcessor.process(line, this._requestId, imageUrlReplacement);
        if (result) {
            console.debug(result);
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
            if (result.participants && result.participants) {
                // this.userParticipants = result.participants.users;
                this._transport.updateParticipants(
                    result.participants.filter(participant => participant.isUser),
                );
            }
            if (result.message && result.message.type === "input_request" && result.requestId) {
                this._requestId = result.requestId;
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
                        this.handleInputResponse(response);
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
        this._transport.updateMessages(this._messages);
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
