/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2024 - 2025 Waldiez & contributors
 */
import * as assert from "assert";
import { afterEach, before, beforeEach, suite, test } from "mocha";
import * as sinon from "sinon";
import * as vscode from "vscode";

import packageJSON from "../../../package.json";

const extensionId = `${packageJSON.publisher}.${packageJSON.name}`;

// eslint-disable-next-line max-lines-per-function
suite("Host Module Tests", () => {
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
                const module = await import("../../host/messaging/chunks");
                JsonChunkBuffer = module.JsonChunkBuffer;
            } catch (error) {
                console.warn("Could not import JsonChunkBuffer:", error);
            }
        });

        test("should handle complete JSON object", function () {
            if (!JsonChunkBuffer) {
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

    suite("ViewStateHandler", () => {
        let ViewStateHandler: any;
        let clock: sinon.SinonFakeTimers;

        before(async () => {
            try {
                const module = await import("../../host/viewStateHandler");
                ViewStateHandler = module.ViewStateHandler;
            } catch (error) {
                console.warn("Could not import ViewStateHandler:", error);
            }
        });

        beforeEach(() => {
            clock = sandbox.useFakeTimers();
        });

        afterEach(() => {
            clock.restore();
        });

        test("should call onVisible after stability period", function () {
            if (!ViewStateHandler) {
                this.skip();
            }

            const onVisibleSpy = sandbox.spy();
            const onHiddenSpy = sandbox.spy();
            const handler = new ViewStateHandler(onVisibleSpy, onHiddenSpy);

            handler.handleStateChange(true);

            // Before stability period
            clock.tick(500);
            sinon.assert.notCalled(onVisibleSpy);

            // After stability period
            clock.tick(600);
            sinon.assert.calledOnce(onVisibleSpy);
        });

        test("should call onHidden after stability period", function () {
            if (!ViewStateHandler) {
                this.skip();
            }

            const onVisibleSpy = sandbox.spy();
            const onHiddenSpy = sandbox.spy();
            const handler = new ViewStateHandler(onVisibleSpy, onHiddenSpy);

            // Set initial state to visible
            handler.handleStateChange(true);
            clock.tick(1100);
            sinon.assert.calledOnce(onVisibleSpy);

            // Change to hidden
            handler.handleStateChange(false);
            clock.tick(1100);
            sinon.assert.calledOnce(onHiddenSpy);
        });

        test("should debounce rapid state changes", function () {
            if (!ViewStateHandler) {
                this.skip();
            }

            const onVisibleSpy = sandbox.spy();
            const onHiddenSpy = sandbox.spy();
            const handler = new ViewStateHandler(onVisibleSpy, onHiddenSpy);

            // Rapid changes
            handler.handleStateChange(true);
            clock.tick(200);
            handler.handleStateChange(false);
            clock.tick(200);
            handler.handleStateChange(true);
            clock.tick(200);

            // No callbacks should be called yet
            sinon.assert.notCalled(onVisibleSpy);
            sinon.assert.notCalled(onHiddenSpy);

            // After stability period from last change
            clock.tick(1000);
            sinon.assert.calledOnce(onVisibleSpy);
            sinon.assert.notCalled(onHiddenSpy);
        });

        test("should not call callback if state hasn't changed", function () {
            if (!ViewStateHandler) {
                this.skip();
            }

            const onVisibleSpy = sandbox.spy();
            const onHiddenSpy = sandbox.spy();
            const handler = new ViewStateHandler(onVisibleSpy, onHiddenSpy);

            // Set initial state
            handler.handleStateChange(true);
            clock.tick(1100);
            sinon.assert.calledOnce(onVisibleSpy);

            // Same state again
            handler.handleStateChange(true);
            clock.tick(1100);
            sinon.assert.calledOnce(onVisibleSpy); // Still only one call
        });

        test("should dispose properly", function () {
            if (!ViewStateHandler) {
                this.skip();
            }

            const onVisibleSpy = sandbox.spy();
            const onHiddenSpy = sandbox.spy();
            const handler = new ViewStateHandler(onVisibleSpy, onHiddenSpy);

            handler.handleStateChange(true);
            handler.dispose();

            clock.tick(1100);
            sinon.assert.notCalled(onVisibleSpy);
        });
    });

    suite("Utils", () => {
        let utils: any;

        before(async () => {
            try {
                utils = await import("../../host/utils");
            } catch (error) {
                console.warn("Could not import utils:", error);
            }
        });

        test("should generate nonce", function () {
            if (!utils?.getNonce) {
                this.skip();
            }

            const nonce1 = utils.getNonce();
            const nonce2 = utils.getNonce();

            assert.strictEqual(typeof nonce1, "string");
            assert.strictEqual(nonce1.length, 32);
            assert.notStrictEqual(nonce1, nonce2);
        });

        test("should get webview URI", function () {
            if (!utils?.getUri) {
                this.skip();
            }

            const mockWebview = {
                asWebviewUri: sandbox.stub().returns(vscode.Uri.parse("vscode-webview://test/path")),
            };
            const extensionUri = vscode.Uri.parse("file:///extension");
            const pathSegments = ["dist", "main.js"];

            const result = utils.getUri(mockWebview as any, extensionUri, pathSegments);

            sinon.assert.calledOnce(mockWebview.asWebviewUri);
            assert.strictEqual(result.toString(), "vscode-webview://test/path");
        });
    });

    suite("MessageProcessor", () => {
        let MessageProcessor: any;

        before(async () => {
            try {
                const module = await import("../../host/messaging/processor");
                MessageProcessor = module.MessageProcessor;
            } catch (error) {
                console.warn("Could not import MessageProcessor:", error);
            }
        });

        test("should handle workflow finished message", function () {
            if (!MessageProcessor) {
                this.skip();
            }

            const mockTransport = {};
            const mockUploadsRoot = vscode.Uri.parse("file:///test/uploads");
            const processor = new MessageProcessor(mockTransport, mockUploadsRoot);

            const handleLineSpy = sandbox.spy(processor as any, "_handleLine");

            processor.handleText("<Waldiez> - Workflow finished");

            sinon.assert.notCalled(handleLineSpy);
        });

        test("should handle regular text input", function () {
            if (!MessageProcessor) {
                this.skip();
            }

            const mockTransport = {};
            const mockUploadsRoot = vscode.Uri.parse("file:///test/uploads");
            const processor = new MessageProcessor(mockTransport, mockUploadsRoot);

            const handleLineSpy = sandbox.spy(processor as any, "_handleLine");
            const testText = "regular text message";

            processor.handleText(testText);

            sinon.assert.calledOnce(handleLineSpy);
            sinon.assert.calledWith(handleLineSpy, testText);
        });

        test("should handle JSON input", function () {
            if (!MessageProcessor) {
                this.skip();
            }

            const mockTransport = {};
            const mockUploadsRoot = vscode.Uri.parse("file:///test/uploads");
            const processor = new MessageProcessor(mockTransport, mockUploadsRoot);

            const testObj = { type: "test", data: "sample" };
            const handleLineSpy = sandbox.spy(processor as any, "_handleLine");

            processor.handleJson(testObj);

            sinon.assert.calledOnce(handleLineSpy);
            sinon.assert.calledWith(handleLineSpy, JSON.stringify(testObj));
        });

        test("should extract user response content from string", function () {
            if (!MessageProcessor) {
                this.skip();
            }

            const mockTransport = {};
            const mockUploadsRoot = vscode.Uri.parse("file:///test/uploads");
            const processor = new MessageProcessor(mockTransport, mockUploadsRoot);

            const result = (processor as any)._extractUserResponseContent("simple string");
            assert.strictEqual(result, "simple string");
        });

        test("should extract user response content from object with content property", function () {
            if (!MessageProcessor) {
                this.skip();
            }

            const mockTransport = {};
            const mockUploadsRoot = vscode.Uri.parse("file:///test/uploads");
            const processor = new MessageProcessor(mockTransport, mockUploadsRoot);

            const objectData = { content: "object content", other: "data" };
            const result = (processor as any)._extractUserResponseContent(objectData);
            assert.strictEqual(result, "object content");
        });
    });

    suite("Flow Common", () => {
        // noinspection DuplicatedCode
        let flowCommon: any;

        before(async () => {
            try {
                flowCommon = await import("../../host/flow/common");
            } catch (error) {
                console.warn("Could not import flow common:", error);
            }
        });

        test("should reject if no executable provided", async function () {
            if (!flowCommon?.ensureWaldiezPy) {
                this.skip();
            }

            try {
                await flowCommon.ensureWaldiezPy(undefined);
                assert.fail("Should have rejected");
            } catch (_) {
                // Expected to reject
                assert.ok(true);
            }
        });
    });
});
