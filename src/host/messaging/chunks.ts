/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2024 - 2025 Waldiez & contributors
 */
export class JsonChunkBuffer {
    private buffer = "";

    constructor(
        private onJson: (json: any) => void,
        private onNonJson?: (line: string) => void,
    ) {}

    handleChunk(chunk: Buffer | string) {
        this.buffer += chunk.toString();

        while (true) {
            const result = this._extractJsonFromBuffer();
            if (!result) {
                break;
            }

            const { json, raw } = result;
            if (json !== undefined) {
                this.onJson(json);
            } else if (this.onNonJson && raw !== undefined) {
                this.onNonJson(raw);
            }
        }
    }

    private _extractJsonFromBuffer():
        | { json: any; raw?: undefined }
        | { raw: string; json?: undefined }
        | null {
        const start = this.buffer.indexOf("{");
        if (start === -1) {
            // no JSON-like structure in buffer
            this.buffer = "";
            return null;
        }

        for (let end = start + 1, depth = 1; end < this.buffer.length; end++) {
            const char = this.buffer[end];
            if (char === "{") {
                depth++;
            } else if (char === "}") {
                depth--;
            }

            if (depth === 0) {
                const jsonText = this.buffer.slice(start, end + 1);
                this.buffer = this.buffer.slice(end + 1);
                try {
                    const parsed = JSON.parse(jsonText);
                    return { json: parsed };
                } catch {
                    return { raw: jsonText }; // invalid JSON, fallback
                }
            }
        }

        // Incomplete JSON object — wait for more data
        return null;
    }
}
