/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2024 - 2026 Waldiez & contributors
 */
import * as assert from "assert";
import { afterEach, before, beforeEach, suite, test } from "mocha";
import * as sinon from "sinon";
import * as vscode from "vscode";

import packageJSON from "../../../../../package.json";

const extensionId = `${packageJSON.publisher}.${packageJSON.name}`;

suite("JsonChunkBuffer Tests", () => {
    // noinspection DuplicatedCode
    let sandbox: sinon.SinonSandbox;

    before(async () => {
        const ext = vscode.extensions.getExtension(extensionId);
        if (!ext) {
            throw new Error(`Extension ${extensionId} not found`);
        }
        await ext.activate();
        await new Promise(resolve => setTimeout(resolve, 500));
    });

    beforeEach(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
    });
    suite("JsonChunkBuffer", () => {
        let JsonChunkBuffer: any;

        before(async () => {
            try {
                const module = await import("../../../../host/messaging/chunks");
                JsonChunkBuffer = module.JsonChunkBuffer;
            } catch (error) {
                console.warn("Could not import JsonChunkBuffer:", error);
            }
        });

        test("should handle complete JSON object", function () {
            if (!JsonChunkBuffer) {
                console.warn("Skipping ....");
                this.skip();
            }

            const onJsonSpy = sandbox.spy();
            const onNonJsonSpy = sandbox.spy();
            const buffer = new JsonChunkBuffer(onJsonSpy, onNonJsonSpy);

            const jsonObj = { type: "message", data: "test" };
            const jsonString = JSON.stringify(jsonObj);

            buffer.handleChunk(jsonString);

            sinon.assert.calledOnce(onJsonSpy);
            assert.deepStrictEqual(onJsonSpy.getCall(0).args[0], jsonObj);
        });

        test("should handle incomplete JSON object", function () {
            if (!JsonChunkBuffer) {
                console.warn("Skipping ....");
                this.skip();
            }

            const onJsonSpy = sandbox.spy();
            const onNonJsonSpy = sandbox.spy();
            const buffer = new JsonChunkBuffer(onJsonSpy, onNonJsonSpy);

            // Send part of JSON
            buffer.handleChunk('{"type": "mess');
            sinon.assert.notCalled(onJsonSpy);

            // Complete the JSON
            buffer.handleChunk('age", "data": "test"}');
            sinon.assert.calledOnce(onJsonSpy);
            assert.deepStrictEqual(onJsonSpy.getCall(0).args[0], { type: "message", data: "test" });
        });

        test("should handle invalid JSON as raw text", function () {
            if (!JsonChunkBuffer) {
                console.warn("Skipping ....");
                this.skip();
            }

            const onJsonSpy = sandbox.spy();
            const onNonJsonSpy = sandbox.spy();
            const buffer = new JsonChunkBuffer(onJsonSpy, onNonJsonSpy);

            buffer.handleChunk('{"invalid": json}');

            sinon.assert.notCalled(onJsonSpy);
            sinon.assert.calledOnce(onNonJsonSpy);
            assert.strictEqual(onNonJsonSpy.getCall(0).args[0], '{"invalid": json}');
        });

        test("should handle buffer with no JSON", function () {
            if (!JsonChunkBuffer) {
                console.warn("Skipping ....");
                this.skip();
            }

            const onJsonSpy = sandbox.spy();
            const onNonJsonSpy = sandbox.spy();
            const buffer = new JsonChunkBuffer(onJsonSpy, onNonJsonSpy);

            buffer.handleChunk("no json here");

            sinon.assert.notCalled(onJsonSpy);
            sinon.assert.notCalled(onNonJsonSpy);
        });

        test("should handle multiple JSON objects in one chunk", function () {
            if (!JsonChunkBuffer) {
                console.warn("Skipping ....");
                this.skip();
            }

            const onJsonSpy = sandbox.spy();
            const onNonJsonSpy = sandbox.spy();
            const buffer = new JsonChunkBuffer(onJsonSpy, onNonJsonSpy);

            const chunk = '{"first": "object"}{"second": "object"}';

            buffer.handleChunk(chunk);

            assert.strictEqual(onJsonSpy.callCount, 2);
            assert.deepStrictEqual(onJsonSpy.getCall(0).args[0], { first: "object" });
            assert.deepStrictEqual(onJsonSpy.getCall(1).args[0], { second: "object" });
        });
    });
});
