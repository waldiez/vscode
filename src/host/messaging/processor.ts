/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2024 - 2025 Waldiez & contributors
 */
import { Writable } from "stream";

import { nanoid } from "nanoid";

import { WaldiezChatMessage, WaldiezChatUserInput } from "@waldiez/react";

import { traceError, traceVerbose, traceWarn } from "../log/logging";
import { extractChatData, extractParticipants, extractUserResponseContent } from "./shared";
import { MessageTransport } from "./transport";

type DataContent = string | object | object[];

export class MessageProcessor {
    private messages: WaldiezChatMessage[] = [];
    // private userParticipants: string[] = [];
    private requestId?: string;
    private _stdin: Writable | undefined | null;
    private _transport: MessageTransport;

    constructor(transport: MessageTransport) {
        this._transport = transport;
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
        let parsed: any;
        try {
            parsed = JSON.parse(line);
        } catch {
            traceError("Failed to parse JSON:", line);
            return;
        }

        if (parsed.participants) {
            this._handleParticipants(parsed.participants);
            return;
        }

        if (!parsed || typeof parsed !== "object" || typeof parsed.type !== "string") {
            traceWarn("Unknown or invalid message format:", parsed);
            return;
        }

        switch (parsed.type) {
            case "input_request":
                this._handleInputRequest(parsed);
                break;
            case "text":
                this._handleText(parsed);
                break;
            case "print":
                this._checkParticipantsOrFlowTermination(parsed);
                break;
            case "select_speaker":
            case "select_speaker_invalid_input": {
                this._handleSelectSpeaker(parsed);
                break;
            }
            case "tool_call":
                this._handleText(parsed);
                break;
            case "group_chat_run_chat":
                this._handleGroupChatRunChat(parsed);
                break;
            case "termination":
                this._handleTermination(parsed);
                break;
            case "generate_code_execution_reply":
                this._handleGenerateCodeExecutionReply(parsed);
                break;
            default:
                traceWarn("Unhandled message type:", parsed.type);
                break;
        }
    }

    private _checkParticipantsOrFlowTermination(parsed: any) {
        // Received data: {"id": "67a32f5a96824589947ce2f75dd7312c", "type": "print",
        // "timestamp": "2025-06-10T23:13:49.403700", "data":
        // "{\"participants\":[{\"name\":\"user\",\"humanInputMode\":\"ALWAYS\"
        // ,\"agentType\":\"user_proxy\"},{\"name\":\"assistant_1\",
        // \"humanInputMode\":\"NEVER\",\"agentType\":\"assistant\"},
        // {\"name\":\"assistant_2\",\"humanInputMode\":\"NEVER\",\"agentType\":\"assistant\"},
        // {\"name\":\"assistant_3\",\"humanInputMode\":\"NEVER\",
        // \"agentType\":\"assistant\"}]}\n"}
        if (parsed.participants) {
            this._handleParticipants(parsed.participants);
            return;
        }
        if (parsed.data && typeof parsed.data === "string") {
            try {
                const innerDumped = JSON.parse(parsed.data);
                if (innerDumped.participants) {
                    this._handleParticipants(innerDumped.participants);
                    return;
                }
            } catch (_) {
                //
            }
            const data = parsed.data.trim().toLowerCase();
            if (data.includes("workflow finished") || data.includes("workflow terminated")) {
                traceVerbose("Workflow finished or terminated:", data);
            }
        }
    }

    private _handleParticipants(participants: any) {
        try {
            const list = typeof participants === "string" ? JSON.parse(participants) : participants;
            const userParticipants = list
                .filter((p: any) => p.humanInputMode?.toUpperCase() === "ALWAYS")
                .map((p: any) => p.name)
                .filter(Boolean);
            this._transport.updateParticipants(userParticipants);
        } catch (err) {
            traceError("Failed to parse participants:", participants, err);
        }
    }

    private _handleInputRequest(parsed: any) {
        this.requestId = parsed.request_id;
        let prompt = parsed.prompt || "Enter your message";
        if (prompt.trim() === ">") {
            prompt = "Enter your message";
        }

        const message: WaldiezChatMessage = {
            id: nanoid(),
            timestamp: new Date().toISOString(),
            type: "input_request",
            request_id: this.requestId,
            content: [{ type: "text", text: prompt }],
        };

        this.messages.push(message);
        this._onMessagesUpdate();
        traceVerbose("Input request received:", parsed);
        this._transport
            .askForInput({
                request_id: parsed.request_id,
                prompt,
                password: parsed.password ?? false,
            })
            .then(response => {
                if (!response) {
                    traceWarn("No response received for input request:", parsed.request_id);
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

    private _onMessagesUpdate(): void {
        this._transport.updateMessages(this.messages);
    }

    private _handleText(parsed: any) {
        const message = this._makeChatMessage(parsed.content, parsed.type);
        this.messages.push(message);
        this._onMessagesUpdate();
    }

    /**
     * Handle group chat run chat messages
     */
    private _handleGroupChatRunChat = (data: unknown) => {
        // # {"type": "group_chat_run_chat", "content":
        // #    {"uuid": "3f2d491e-deb3-4f28-8991-cb8eb67ea3a6",
        // #    "speaker": "executor", "silent": false}}
        //
        if (typeof data !== "object" || data === null || !("content" in data)) {
            traceWarn("Invalid data format for group_chat_run_chat:", data);
            return;
        }
        if (
            data.content &&
            typeof data.content === "object" &&
            data.content !== null &&
            "uuid" in data.content &&
            typeof data.content.uuid === "string" &&
            "speaker" in data.content &&
            typeof data.content.speaker === "string"
        ) {
            const chatMessage: WaldiezChatMessage = {
                id: nanoid(),
                timestamp: new Date().toISOString(),
                type: "system",
                content: [
                    {
                        type: "text",
                        text: "Group chat run",
                    },
                ],
                sender: data.content.speaker,
            };
            this.messages.push(chatMessage);
            this._onMessagesUpdate();
        }
    };

    /**
     * Handle generate code execution reply messages
     */
    private _handleGenerateCodeExecutionReply = (data: unknown) => {
        // # {"type": "generate_code_execution_reply", "content":
        // #    {"uuid": "af6e6cfd-edf6-4785-a490-97358ae3d306",
        // #   "code_blocks": ["md"], "sender": "manager", "recipient": "executor"}}
        if (typeof data !== "object" || data === null || !("content" in data)) {
            traceWarn("Invalid data format for generate_code_execution_reply:", data);
            return;
        }
        if (
            data.content &&
            typeof data.content === "object" &&
            data.content !== null &&
            "uuid" in data.content &&
            typeof data.content.uuid === "string" &&
            "sender" in data.content &&
            typeof data.content.sender === "string" &&
            "recipient" in data.content &&
            typeof data.content.recipient === "string"
        ) {
            const chatMessage: WaldiezChatMessage = {
                id: nanoid(),
                timestamp: new Date().toISOString(),
                type: "system",
                content: [
                    {
                        type: "text",
                        text: "Generate code execution reply",
                    },
                ],
                sender: data.content.sender,
                recipient: data.content.recipient,
            };
            this.messages.push(chatMessage);
            this._onMessagesUpdate();
        }
    };

    /**
     * Handle select speaker messages
     */
    private _handleSelectSpeaker = (data: unknown) => {
        if (
            typeof data === "object" &&
            data !== null &&
            "uuid" in data &&
            typeof (data as any).uuid === "string" &&
            "agents" in data &&
            Array.isArray((data as any).agents) &&
            (data as any).agents.every((agent: any) => typeof agent === "string")
        ) {
            const chatMessage: WaldiezChatMessage = {
                id: (data as any).uuid,
                timestamp: new Date().toISOString(),
                type: "system",
                content: [
                    {
                        type: "text",
                        text: this._getSpeakerSelectionMd((data as any).agents),
                    },
                ],
            };
            this.messages.push(chatMessage);
            this._onMessagesUpdate();
        }
    };

    /**
     * Get speaker selection markdown
     */
    private _getSpeakerSelectionMd = (agents: string[]): string => {
        const agentList = agents.map((agent, index) => {
            return `- ${index + 1}. ${agent}`;
        });
        return `Select a speaker from the list below:\n\n${agentList.join("\n")}`;
    };

    /**
     * Handle a termination message.
     * @param data The message object to handle
     * @private
     */
    private _handleTermination = (data: any) => {
        if (
            data.content &&
            typeof data.content === "object" &&
            data.content !== null &&
            "termination_reason" in data.content &&
            typeof data.content.termination_reason === "string"
        ) {
            const terminationMessage: WaldiezChatMessage = {
                id: nanoid(),
                timestamp: new Date().toISOString(),
                type: "system",
                content: [
                    {
                        type: "text",
                        text: data.content.termination_reason,
                    },
                ],
            };
            this.messages.push(terminationMessage);
            this._onMessagesUpdate();
        }
    };

    /**
     * Create a chat message from raw data
     * @param raw The raw data content
     * @param type The type of the message, default is "text"
     * @returns A WaldiezChatMessage object
     */
    private _makeChatMessage(raw: DataContent, type = "text"): WaldiezChatMessage {
        const id = nanoid();
        const timestamp = new Date().toISOString();
        const content = extractChatData(raw);
        const { sender, recipient } = extractParticipants(raw);

        return {
            id,
            timestamp,
            type,
            request_id: this.requestId,
            sender,
            recipient,
            content,
        };
    }
}
