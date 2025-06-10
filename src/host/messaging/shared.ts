/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2024 - 2025 Waldiez & contributors
 */
import { WaldiezMediaContent } from "@waldiez/react";

/**
 * Extracts chat data from various input formats.
 *
 * @param input - The input data which can be a string, array, or object.
 * @returns An array of WaldiezMediaContent objects representing the chat data.
 */
export const extractChatData = (input: unknown): WaldiezMediaContent[] => {
    if (typeof input === "string") {
        try {
            return extractChatData(JSON.parse(input));
        } catch {
            return [{ type: "text", text: input }];
        }
    }

    if (Array.isArray(input)) {
        return input.map(getChatContent);
    }

    if (input && typeof input === "object") {
        if ("type" in input) {
            return [getChatContent(input)];
        }
        if ("content" in input) {
            const content = Array.isArray(input.content) ? input.content : [input.content];
            return content.map(getChatContent);
        }
        return [{ type: "text", text: JSON.stringify(input) }];
    }

    return [{ type: "text", text: String(input) }];
};

export const getChatContent = (item: any): WaldiezMediaContent => {
    if (!item?.type || typeof item.type !== "string") {
        return { type: "text", text: typeof item !== "string" ? JSON.stringify(item) : item };
    }

    switch (item.type) {
        case "text":
            return { type: "text", text: item.text ?? "" };
        case "image":
            return { type: "image", image: item.image };
        case "image_url":
            return { type: "image_url", image_url: item.image_url };
        case "video":
            return { type: "video", video: item.video };
        case "audio":
            return { type: "audio", audio: item.audio };
        case "file":
        case "document":
        case "markdown":
            return { type: item.type, file: item.file };
        default:
            return { type: "text", text: `[Unknown type: ${item.type}]` };
    }
};

export const extractParticipants = (raw: unknown): { sender?: string; recipient?: string } => {
    if (typeof raw === "string") {
        try {
            return extractParticipants(JSON.parse(raw));
        } catch {
            return {};
        }
    }

    if (Array.isArray(raw)) {
        return extractParticipants(raw[0]);
    }

    if (typeof raw === "object" && raw !== null) {
        const sender = "sender" in raw && typeof raw.sender === "string" ? raw.sender : undefined;
        const recipient = "recipient" in raw && typeof raw.recipient === "string" ? raw.recipient : undefined;

        if (sender || recipient) {
            return { sender, recipient };
        }

        if ("content" in raw) {
            return extractParticipants(raw["content"]);
        }
    }

    return {};
};

export const extractUserResponseContent = (data: any): any => {
    if (typeof data === "string") {
        try {
            return extractUserResponseContent(JSON.parse(data));
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
