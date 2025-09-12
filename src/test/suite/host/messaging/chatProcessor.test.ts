/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2024 - 2025 Waldiez & contributors
 */
import * as assert from "assert";
import { afterEach, before, beforeEach, suite, test } from "mocha";
import * as sinon from "sinon";
import * as vscode from "vscode";

import packageJSON from "../../../../../package.json";

const extensionId = `${packageJSON.publisher}.${packageJSON.name}`;

suite("ChatMessageProcessor Tests", () => {
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
    suite("ChatMessageProcessor", () => {
        let ChatMessageProcessor: any;

        before(async () => {
            try {
                const module = await import("../../../../host/messaging/chatProcessor");
                ChatMessageProcessor = module.ChatMessageProcessor;
            } catch (error) {
                console.warn("Could not import ChatMessageProcessor:", error);
            }
        });

        test("should handle workflow finished message", function () {
            if (!ChatMessageProcessor) {
                console.warn("Skipping ....");
                this.skip();
            }

            const mockTransport = {};
            const mockUploadsRoot = vscode.Uri.parse("file:///test/uploads");
            const processor = new ChatMessageProcessor(mockTransport, mockUploadsRoot);

            const handleLineSpy = sandbox.spy(processor as any, "handleLine");

            processor.handleText("<Waldiez> - Workflow finished");

            sinon.assert.notCalled(handleLineSpy);
        });

        test("should handle regular text input", function () {
            if (!ChatMessageProcessor) {
                console.warn("Skipping ....");
                this.skip();
            }

            const mockTransport = {};
            const mockUploadsRoot = vscode.Uri.parse("file:///test/uploads");
            const processor = new ChatMessageProcessor(mockTransport, mockUploadsRoot);

            const handleLineSpy = sandbox.spy(processor as any, "handleLine");
            const testText = "regular text message";

            processor.handleText(testText);

            sinon.assert.calledOnce(handleLineSpy);
            sinon.assert.calledWith(handleLineSpy, testText);
        });

        test("should handle JSON input", function () {
            if (!ChatMessageProcessor) {
                console.warn("Skipping ....");
                this.skip();
            }

            const mockTransport = {};
            const mockUploadsRoot = vscode.Uri.parse("file:///test/uploads");
            const processor = new ChatMessageProcessor(mockTransport, mockUploadsRoot);

            const testObj = { type: "test", data: "sample" };
            const handleLineSpy = sandbox.spy(processor as any, "handleLine");

            processor.handleJson(testObj);

            sinon.assert.calledOnce(handleLineSpy);
            sinon.assert.calledWith(handleLineSpy, JSON.stringify(testObj));
        });

        test("should extract user response content from string", function () {
            if (!ChatMessageProcessor) {
                console.warn("Skipping ....");
                this.skip();
            }

            const mockTransport = {};
            const mockUploadsRoot = vscode.Uri.parse("file:///test/uploads");
            const processor = new ChatMessageProcessor(mockTransport, mockUploadsRoot);

            const result = (processor as any)._extractUserResponseContent("simple string");
            assert.strictEqual(result, "simple string");
        });

        test("should extract user response content from object with content property", function () {
            if (!ChatMessageProcessor) {
                console.warn("Skipping ....");
                this.skip();
            }

            const mockTransport = {};
            const mockUploadsRoot = vscode.Uri.parse("file:///test/uploads");
            const processor = new ChatMessageProcessor(mockTransport, mockUploadsRoot);

            const objectData = { content: "object content", other: "data" };
            const result = (processor as any)._extractUserResponseContent(objectData);
            assert.strictEqual(result, "object content");
        });
    });
});
