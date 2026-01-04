/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2024 - 2026 Waldiez & contributors
 */
/* eslint-disable max-depth,max-statements */
export class JsonChunkBuffer {
    private buffer = "";

    constructor(
        private onJson: (json: any) => void,
        private onNonJson?: (line: string) => void,
    ) {}

    handleChunk(chunk: Buffer | string) {
        this.buffer += chunk.toString();

        while (this.processBuffer()) {
            // Continue processing until no more complete data can be extracted
        }
    }

    private processBuffer(): boolean {
        // First, check if there's any non-JSON content before the first '{'
        const jsonStart = this.buffer.indexOf("{");

        if (jsonStart > 0) {
            // Extract and process non-JSON content
            const nonJsonContent = this.buffer.slice(0, jsonStart);
            this.buffer = this.buffer.slice(jsonStart);

            // Split by newlines and process each line
            const lines = nonJsonContent.split("\n");
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed && this.onNonJson) {
                    this.onNonJson(line);
                }
            }

            return true; // Continue processing the remaining buffer
        }

        if (jsonStart === 0) {
            // Try to extract a complete JSON object
            const result = this._extractJsonObject();
            if (result) {
                if (result.json !== undefined) {
                    this.onJson(result.json);
                } else if (result.raw !== undefined && this.onNonJson) {
                    this.onNonJson(result.raw);
                }
                return true; // Continue processing
            }
            // Incomplete JSON, wait for more data
            return false;
        }

        // No JSON found in buffer (jsonStart === -1)
        // Process any complete lines as non-JSON
        const lines = this.buffer.split("\n");

        if (lines.length > 1) {
            // Process all complete lines (all but the last)
            for (let i = 0; i < lines.length - 1; i++) {
                const line = lines[i].trim();
                if (line && this.onNonJson) {
                    this.onNonJson(lines[i]); // Send original line with whitespace
                }
            }

            // Keep only the last incomplete line in the buffer
            this.buffer = lines[lines.length - 1];
            return lines.length > 1; // Continue if we processed any lines
        }

        // Only partial line in buffer, wait for more data
        return false;
    }
    private _extractJsonObject(): { json: any; raw?: undefined } | { raw: string; json?: undefined } | null {
        let depth = 0;
        let inString = false;
        let escapeNext = false;

        // Scan through buffer character by character
        for (let i = 0; i < this.buffer.length; i++) {
            const char = this.buffer[i];

            // Handle escape sequences
            if (escapeNext) {
                escapeNext = false;
                continue;
            }

            if (char === "\\") {
                escapeNext = true;
                continue;
            }

            // Track whether we're inside a string
            if (char === '"') {
                inString = !inString;
                continue;
            }

            // Only count braces outside of strings
            if (!inString) {
                if (char === "{") {
                    depth++;
                } else if (char === "}") {
                    depth--;

                    // Found complete JSON object
                    if (depth === 0) {
                        const jsonText = this.buffer.slice(0, i + 1);
                        this.buffer = this.buffer.slice(i + 1);

                        try {
                            const parsed = JSON.parse(jsonText);
                            return { json: parsed };
                        } catch (_) {
                            // Invalid JSON, return as raw text
                            return { raw: jsonText };
                        }
                    }
                }
            }
        }

        // Incomplete JSON object - need more data
        return null;
    }
}
