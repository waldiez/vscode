/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2024 - 2025 Waldiez & contributors
 */
import { Writable } from "stream";
import * as vscode from "vscode";

import { WaldiezChatParticipant, WaldiezTimelineData } from "@waldiez/react";

import { RunMode, WaldiezUserInput } from "../../types";
import { traceError, traceInfo, traceVerbose, traceWarn } from "../log/logging";
import { MessageTransport } from "./transport";

/**
 * MessageProcessor is responsible for processing incoming messages from the Waldiez chat system.
 * It handles raw data, processes individual lines, and manages user input requests.
 */
export abstract class MessageProcessor {
    protected _requestId?: string;
    protected _stdin: Writable | undefined | null;
    protected readonly _uploadsRoot: vscode.Uri;
    protected readonly _transport: MessageTransport;
    protected readonly _runMode: RunMode;

    /**
     * Creates an instance of MessageProcessor.
     * @param transport - The MessageTransport instance used for communication.
     * @param uploadsRoot - The root URI for uploads, used to construct image URLs.
     */
    constructor(transport: MessageTransport, uploadsRoot: vscode.Uri, runMode: RunMode) {
        this._transport = transport;
        this._uploadsRoot = uploadsRoot;
        this._runMode = runMode;
    }

    // subclasses should handle output based on the runMode
    protected abstract handleLine(text: string): void;

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
    public handleInputResponse(userInput: WaldiezUserInput | undefined) {
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
        traceVerbose(`Sending input response: ${JSON.stringify(obj)}`);
        this._stdin?.write(`${JSON.stringify(obj)}\n`, err => {
            if (err) {
                traceError("Failed to write to stdin:", err);
            } else {
                traceVerbose(`Successfully sent input response: ${data.trim()}`);
            }
        });
    }

    protected askForInput(requestId: string, prompt: string, password: boolean) {
        this._transport
            .askForInput({
                request_id: requestId,
                prompt,
                password,
                runMode: this._runMode,
            })
            .then(response => {
                if (!response) {
                    traceWarn("No response received for input request:", requestId);
                    this._stdin?.write("\n");
                    return;
                }
                this.handleInputResponse(response);
            })
            .catch(err => {
                traceError("Error handling input request:", err);
                this._stdin?.write("\n");
            });
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
     * Updates the transport with the current timeline.
     * This method is called whenever the timeline is updated.
     * @param timeline - The updated timeline data.
     */
    protected _onTimelineUpdate(timeline: WaldiezTimelineData): void {
        this._transport.updateTimeline(timeline, this._runMode);
    }
    /**
     * Update the chat participants.
     * @param participants The chat participants
     */
    protected _onParticipantsUpdate(participants: WaldiezChatParticipant[]): void {
        if (this._runMode === "chat") {
            // send only the users
            this._transport.updateParticipants(
                participants.filter(participant => participant.isUser),
                this._runMode,
            );
            return;
        }
        // send all participants
        this._transport.updateParticipants(participants, this._runMode);
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
