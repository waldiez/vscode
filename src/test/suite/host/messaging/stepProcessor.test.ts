/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2024 - 2025 Waldiez & contributors
 */
/* eslint-disable @typescript-eslint/no-require-imports */
import * as assert from "assert";
import { afterEach, before, beforeEach, suite, test } from "mocha";
import * as sinon from "sinon";
import * as vscode from "vscode";

import packageJSON from "../../../../../package.json";

const extensionId = `${packageJSON.publisher}.${packageJSON.name}`;

suite("StepMessageProcessor Tests", () => {
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

    suite("StepMessageProcessor", () => {
        let StepMessageProcessor: any;

        before(async () => {
            try {
                const module = await import("../../../../host/messaging/stepProcessor");
                StepMessageProcessor = module.StepMessageProcessor;
            } catch (error) {
                console.warn("Could not import StepMessageProcessor:", error);
            }
        });

        test("should create instance with correct parameters", function () {
            if (!StepMessageProcessor) {
                console.warn("Skipping ....");
                this.skip();
            }

            const mockTransport = {
                updateStepByStepState: sandbox.stub(),
            };
            const mockUploadsRoot = vscode.Uri.parse("file:///test/uploads");
            const processor = new StepMessageProcessor(mockTransport, mockUploadsRoot);

            assert.ok(processor);
            assert.strictEqual((processor as any)._runMode, "step");
        });

        test("should handle participants update", function () {
            if (!StepMessageProcessor) {
                console.warn("Skipping ....");
                this.skip();
            }

            // Mock the Waldiez modules after import
            const waldiezReact = require("@waldiez/react");
            const processStub = sandbox.stub(waldiezReact.WaldiezStepByStepProcessor, "process");

            const mockTransport = {
                updateStepByStepState: sandbox.stub(),
                updateParticipants: sandbox.stub(),
            };
            const mockUploadsRoot = vscode.Uri.parse("file:///test/uploads");
            const processor = new StepMessageProcessor(mockTransport, mockUploadsRoot);

            const participants = [{ name: "agent1", role: "user" }];
            const processResult = {
                stateUpdate: {
                    participants: participants,
                },
            };

            processStub.returns(processResult);

            const onParticipantsUpdateSpy = sandbox.spy(processor as any, "_onParticipantsUpdate");

            processor.handleText("test line");

            sinon.assert.calledOnce(onParticipantsUpdateSpy);
            sinon.assert.calledWith(onParticipantsUpdateSpy, participants);
        });

        test("should handle timeline update", function () {
            if (!StepMessageProcessor) {
                console.warn("Skipping ....");
                this.skip();
            }

            const waldiezReact = require("@waldiez/react");
            const processStub = sandbox.stub(waldiezReact.WaldiezStepByStepProcessor, "process");

            const mockTransport = {
                updateStepByStepState: sandbox.stub(),
                updateTimeline: sandbox.stub(),
            };
            const mockUploadsRoot = vscode.Uri.parse("file:///test/uploads");
            const processor = new StepMessageProcessor(mockTransport, mockUploadsRoot);

            const timeline = [{ timestamp: "2024-01-01", event: "test" }];
            const processResult = {
                stateUpdate: {
                    timeline: timeline,
                },
            };

            processStub.returns(processResult);

            const onTimelineUpdateSpy = sandbox.spy(processor as any, "_onTimelineUpdate");

            processor.handleText("test line");

            sinon.assert.calledOnce(onTimelineUpdateSpy);
            sinon.assert.calledWith(onTimelineUpdateSpy, timeline);
        });

        test("should handle active request", function () {
            if (!StepMessageProcessor) {
                console.warn("Skipping ....");
                this.skip();
            }

            const waldiezReact = require("@waldiez/react");
            const processStub = sandbox.stub(waldiezReact.WaldiezStepByStepProcessor, "process");

            const mockTransport = {
                updateStepByStepState: sandbox.stub(),
                askForInput: sandbox.stub().resolves(undefined),
            };
            const mockUploadsRoot = vscode.Uri.parse("file:///test/uploads");
            const processor = new StepMessageProcessor(mockTransport, mockUploadsRoot);

            const activeRequest = {
                request_id: "req123",
                prompt: "Please enter input:",
                password: false,
            };
            const processResult = {
                stateUpdate: {
                    activeRequest: activeRequest,
                },
            };

            processStub.returns(processResult);

            const askForInputSpy = sandbox.spy(processor as any, "askForInput");

            processor.handleText("test line");

            sinon.assert.calledOnce(askForInputSpy);
            sinon.assert.calledWith(askForInputSpy, "req123", "Please enter input:", false);
            assert.strictEqual((processor as any)._requestId, "req123");
        });

        test("should handle successful step result", function () {
            if (!StepMessageProcessor) {
                console.warn("Skipping ....");
                this.skip();
            }

            const waldiezReact = require("@waldiez/react");
            const processStub = sandbox.stub(waldiezReact.WaldiezStepByStepProcessor, "process");

            const mockTransport = {
                updateStepByStepState: sandbox.stub(),
            };
            const mockUploadsRoot = vscode.Uri.parse("file:///test/uploads");
            const processor = new StepMessageProcessor(mockTransport, mockUploadsRoot);

            const stateUpdate = {
                status: "running",
                currentStep: 5,
            };
            const processResult = {
                stateUpdate: stateUpdate,
            };

            processStub.returns(processResult);

            processor.handleText("test line");

            sinon.assert.calledOnce(mockTransport.updateStepByStepState);
            sinon.assert.calledWith(mockTransport.updateStepByStepState, stateUpdate);
        });

        test("should handle null result", function () {
            if (!StepMessageProcessor) {
                console.warn("Skipping ....");
                this.skip();
            }

            const waldiezReact = require("@waldiez/react");
            const processStub = sandbox.stub(waldiezReact.WaldiezStepByStepProcessor, "process");

            const mockTransport = {
                updateStepByStepState: sandbox.stub(),
            };
            const mockUploadsRoot = vscode.Uri.parse("file:///test/uploads");
            const processor = new StepMessageProcessor(mockTransport, mockUploadsRoot);

            processStub.returns(null);

            processor.handleText("test line");

            sinon.assert.notCalled(mockTransport.updateStepByStepState);
        });

        test("should handle undefined result", function () {
            if (!StepMessageProcessor) {
                console.warn("Skipping ....");
                this.skip();
            }

            const waldiezReact = require("@waldiez/react");
            const processStub = sandbox.stub(waldiezReact.WaldiezStepByStepProcessor, "process");

            const mockTransport = {
                updateStepByStepState: sandbox.stub(),
            };
            const mockUploadsRoot = vscode.Uri.parse("file:///test/uploads");
            const processor = new StepMessageProcessor(mockTransport, mockUploadsRoot);

            processStub.returns(undefined);

            processor.handleText("test line");

            sinon.assert.notCalled(mockTransport.updateStepByStepState);
        });

        test("should handle workflow finished message", function () {
            if (!StepMessageProcessor) {
                console.warn("Skipping ....");
                this.skip();
            }

            const mockTransport = {
                updateStepByStepState: sandbox.stub(),
            };
            const mockUploadsRoot = vscode.Uri.parse("file:///test/uploads");
            const processor = new StepMessageProcessor(mockTransport, mockUploadsRoot);

            const handleLineSpy = sandbox.spy(processor as any, "handleLine");

            processor.handleText("<Waldiez> - Workflow finished");

            sinon.assert.notCalled(handleLineSpy);
        });

        test("should handle error result with no chat fallback", function () {
            if (!StepMessageProcessor) {
                console.warn("Skipping ....");
                this.skip();
            }

            const waldiezReact = require("@waldiez/react");
            const stepProcessStub = sandbox.stub(waldiezReact.WaldiezStepByStepProcessor, "process");
            const chatProcessStub = sandbox.stub(waldiezReact.WaldiezChatMessageProcessor, "process");

            const mockTransport = {
                updateStepByStepState: sandbox.stub(),
                asWebviewUri: sandbox.stub().returns({ toString: () => "file://test/image.png" }),
            };
            const mockUploadsRoot = vscode.Uri.parse("file:///test/uploads");
            const processor = new StepMessageProcessor(mockTransport, mockUploadsRoot);

            const error = { message: "Processing error" };
            const stepResult = { error: error };

            stepProcessStub.returns(stepResult);
            chatProcessStub.returns(null);

            processor.handleText("test line");

            sinon.assert.calledOnce(mockTransport.updateStepByStepState);
            sinon.assert.calledWith(mockTransport.updateStepByStepState, {
                lastError: "Processing error",
            });
        });

        test("should handle error result with chat fallback - message", function () {
            if (!StepMessageProcessor) {
                console.warn("Skipping ....");
                this.skip();
            }

            const waldiezReact = require("@waldiez/react");
            const stepProcessStub = sandbox.stub(waldiezReact.WaldiezStepByStepProcessor, "process");
            const chatProcessStub = sandbox.stub(waldiezReact.WaldiezChatMessageProcessor, "process");

            const mockTransport = {
                updateStepByStepState: sandbox.stub(),
                asWebviewUri: sandbox.stub().returns({ toString: () => "file://test/image.png" }),
            };
            const mockUploadsRoot = vscode.Uri.parse("file:///test/uploads");
            const processor = new StepMessageProcessor(mockTransport, mockUploadsRoot);
            (processor as any)._requestId = "req123";

            const error = { message: "Processing error" };
            const stepResult = { error: error };
            const message = { type: "chat", content: "test message" };
            const chatResult = { message: message };

            stepProcessStub.returns(stepResult);
            chatProcessStub.returns(chatResult);

            processor.handleText("test line");

            sinon.assert.calledOnce(mockTransport.updateStepByStepState);
            sinon.assert.calledWith(mockTransport.updateStepByStepState, {
                eventHistory: [message],
                currentEvent: message,
            });
        });
    });
});
