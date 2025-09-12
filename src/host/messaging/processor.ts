/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2024 - 2025 Waldiez & contributors
 */
import { Writable } from "stream";
import * as vscode from "vscode";

import { MessageTransport } from "./transport";

/**
 * MessageProcessor is responsible for processing incoming messages from the Waldiez chat system.
 * It handles raw data, processes individual lines, and manages user input requests.
 */
export class MessageProcessor {
    protected _requestId?: string;
    protected _stdin: Writable | undefined | null;
    protected _uploadsRoot: vscode.Uri;
    protected readonly _transport: MessageTransport;

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
}
