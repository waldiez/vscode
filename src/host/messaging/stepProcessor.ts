/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2024 - 2025 Waldiez & contributors
 */
import * as vscode from "vscode";

import {
    WaldiezChatMessageProcessor,
    WaldiezStepByStepProcessingResult,
    WaldiezStepByStepProcessor,
} from "@waldiez/react";

import { traceError, traceVerbose, traceWarn } from "../log/logging";
import { MessageProcessor } from "./processor";
import { MessageTransport } from "./transport";

export class StepMessageProcessor extends MessageProcessor {
    /**
     * Creates an instance of MessageProcessor.
     * @param transport - The MessageTransport instance used for communication.
     * @param uploadsRoot - The root URI for uploads, used to construct image URLs.
     */
    constructor(transport: MessageTransport, uploadsRoot: vscode.Uri) {
        super(transport, uploadsRoot, "step");
    }
    /**
     * Handles a single line of input data.
     * This method processes the line, extracts messages, and handles user input requests.
     * @param line - The line of data to process.
     */
    protected handleLine(line: string) {
        traceVerbose("Processing line:\n", line);
        const result = WaldiezStepByStepProcessor.process(line, {
            requestId: this._requestId,
        });
        if (result?.stateUpdate?.participants) {
            this._onParticipantsUpdate(result.stateUpdate.participants);
            return;
        }
        if (result?.stateUpdate?.timeline) {
            this._onTimelineUpdate(result.stateUpdate.timeline);
            return;
        }
        if (result?.stateUpdate?.activeRequest) {
            this._requestId = result.stateUpdate.activeRequest.request_id;
            this.askForInput(
                result.stateUpdate.activeRequest.request_id,
                result.stateUpdate.activeRequest.prompt,
                result.stateUpdate.activeRequest.password || false,
            );
            return;
        }
        if (result?.stateUpdate?.pendingControlInput) {
            this._requestId = result.stateUpdate.pendingControlInput.request_id;
            this._transport
                .askForControl({
                    request_id: result.stateUpdate.pendingControlInput.request_id,
                    prompt: result.stateUpdate.pendingControlInput.prompt,
                })
                .then(response => {
                    if (!response) {
                        traceWarn("No response received for control request");
                        this._stdin?.write("\n");
                        return;
                    }
                    this.handleInputResponse(response, false);
                })
                .catch(err => {
                    traceError("Error handling control request:", err);
                    this._stdin?.write("\n");
                });
            return;
        }
        if (result?.error) {
            this._handleStepResultError(line, result);
            return;
        }
        this._handleStepResult(result);
    }
    private _handleStepResultError(line: string, result: WaldiezStepByStepProcessingResult) {
        let imageUrlReplacement: string | undefined;
        if (this._requestId) {
            imageUrlReplacement = this.transporter
                .asWebviewUri(vscode.Uri.joinPath(this._uploadsRoot, `${this._requestId}.png`))
                .toString();
        }
        const chatResult = WaldiezChatMessageProcessor.process(line, this._requestId, imageUrlReplacement);
        if (chatResult?.participants) {
            this._onParticipantsUpdate(chatResult.participants);
            return;
        }
        if (chatResult?.timeline) {
            this._onTimelineUpdate(chatResult.timeline);
            return;
        }
        if (chatResult?.message) {
            this._transport.updateStepByStepState({
                eventHistory: [chatResult.message],
                currentEvent: chatResult.message,
            });
            return;
        }
        if (result.error) {
            this._transport.updateStepByStepState({
                lastError: result.error.message,
            });
        }
    }
    private _handleStepResult(result?: WaldiezStepByStepProcessingResult) {
        traceVerbose("Step result: ", result);
        if (!result) {
            return;
        }
        if (result.stateUpdate) {
            this._transport.updateStepByStepState({
                ...result.stateUpdate,
            });
        }
    }
}
