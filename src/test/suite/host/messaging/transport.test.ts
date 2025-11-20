/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2024 - 2025 Waldiez & contributors
 */
/* eslint-disable max-lines-per-function,max-lines,max-statements */
import * as assert from "assert";
import { afterEach, before, beforeEach, suite, test } from "mocha";
import * as sinon from "sinon";
import * as vscode from "vscode";

import packageJSON from "../../../../../package.json";

const extensionId = `${packageJSON.publisher}.${packageJSON.name}`;

suite("MessageTransport Tests", () => {
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
    suite("MessageTransport", () => {
        let MessageTransport: any;

        before(async () => {
            try {
                const module = await import("../../../../host/messaging/transport");
                MessageTransport = module.MessageTransport;
            } catch (error) {
                console.warn("Could not import MessageTransport:", error);
            }
        });

        test("should create transport instance", function () {
            if (!MessageTransport) {
                console.warn("Skipping ....");
                this.skip();
            }

            const mockPanel = {
                webview: {
                    onDidReceiveMessage: sandbox.stub().returns({ dispose: sandbox.spy() }),
                    postMessage: sandbox.spy(),
                    asWebviewUri: sandbox.stub().callsFake(uri => uri),
                },
                active: true,
            };

            const mockDocument = {
                uri: vscode.Uri.parse("file:///test.waldiez"),
                getText: sandbox.stub().returns('{"type": "flow"}'),
                lineCount: 1,
            };

            const onRun = sandbox.spy();
            const onStop = sandbox.spy();
            const onInit = sandbox.spy();
            const onGetCheckpoints = sandbox.spy();

            const transport = new MessageTransport(
                mockPanel,
                mockDocument,
                onRun,
                onStop,
                onGetCheckpoints,
                onInit,
            );

            assert.ok(transport);
        });

        test("should return webview URI", function () {
            if (!MessageTransport) {
                console.warn("Skipping ....");
                this.skip();
            }

            const mockPanel = {
                webview: {
                    onDidReceiveMessage: sandbox.stub().returns({ dispose: sandbox.spy() }),
                    asWebviewUri: sandbox.stub().returns(vscode.Uri.parse("vscode-webview://test")),
                },
                active: true,
            };

            // noinspection JSUnusedGlobalSymbols
            const mockDocument = {
                uri: vscode.Uri.parse("file:///test.waldiez"),
                getText: () => "{}",
                lineCount: 1,
            };
            const transport = new MessageTransport(
                mockPanel,
                mockDocument,
                () => {},
                () => {},
                () => {},
                () => {},
            );

            const testUri = vscode.Uri.parse("file:///test.png");
            transport.asWebviewUri(testUri);

            sinon.assert.calledWith(mockPanel.webview.asWebviewUri, testUri);
        });

        test("should send message when panel is active", function () {
            if (!MessageTransport) {
                console.warn("Skipping ....");
                this.skip();
            }

            const clock = sinon.useFakeTimers();

            const mockPanel = {
                webview: {
                    onDidReceiveMessage: sandbox.stub().returns({ dispose: sandbox.spy() }),
                    postMessage: sandbox.spy(),
                },
                active: true,
            };

            // noinspection JSUnusedGlobalSymbols
            const mockDocument = {
                uri: vscode.Uri.parse("file:///test.waldiez"),
                getText: () => "{}",
                lineCount: 1,
            };
            const transport = new MessageTransport(
                mockPanel,
                mockDocument,
                () => {},
                () => {},
                () => {},
                () => {},
            );

            transport.sendMessage({ type: "init", value: "data" });

            clock.tick(100);

            // Should eventually call postMessage (might be debounced)
            sinon.assert.calledOnce(mockPanel.webview.postMessage);

            clock.restore();
        });

        test("should not send message when panel inactive", function () {
            if (!MessageTransport) {
                console.warn("Skipping ....");
                this.skip();
            }

            const mockPanel = {
                webview: {
                    onDidReceiveMessage: sandbox.stub().returns({ dispose: sandbox.spy() }),
                    postMessage: sandbox.spy(),
                },
                active: false, // Inactive panel
            };

            // noinspection JSUnusedGlobalSymbols
            const mockDocument = {
                uri: vscode.Uri.parse("file:///test.waldiez"),
                getText: () => "{}",
                lineCount: 1,
            };
            const transport = new MessageTransport(
                mockPanel,
                mockDocument,
                () => {},
                () => {},
                () => {},
                () => {},
            );

            transport.sendMessage({ type: "test", value: "data" });

            sinon.assert.notCalled(mockPanel.webview.postMessage);
        });

        test("should skip document update if content is same", function () {
            if (!MessageTransport) {
                console.warn("Skipping ....");
                this.skip();
            }

            const mockPanel = {
                webview: {
                    onDidReceiveMessage: sandbox.stub().returns({ dispose: sandbox.spy() }),
                    postMessage: sandbox.spy(),
                },
                active: true,
            };

            const currentContent = '{"same": "content"}';
            const mockDocument = {
                uri: vscode.Uri.parse("file:///test.waldiez"),
                getText: sandbox.stub().returns(currentContent),
                lineCount: 1,
            };

            const applyEditStub = sandbox.stub(vscode.workspace, "applyEdit").resolves(true);

            const transport = new MessageTransport(
                mockPanel,
                mockDocument,
                () => {},
                () => {},
                () => {},
                () => {},
            );

            transport.updateDocument(currentContent); // Same content

            sinon.assert.notCalled(applyEditStub);

            applyEditStub.restore();
        });

        test("should update document with different content", function () {
            if (!MessageTransport) {
                console.warn("Skipping ....");
                this.skip();
            }

            const mockPanel = {
                webview: {
                    onDidReceiveMessage: sandbox.stub().returns({ dispose: sandbox.spy() }),
                    postMessage: sandbox.spy(),
                },
                active: true,
            };

            const mockDocument = {
                uri: vscode.Uri.parse("file:///test.waldiez"),
                getText: sandbox.stub().returns('{"old": "content"}'),
                lineCount: 1,
            };

            const applyEditStub = sandbox.stub(vscode.workspace, "applyEdit").resolves(true);

            const transport = new MessageTransport(
                mockPanel,
                mockDocument,
                () => {},
                () => {},
                () => {},
                () => {},
            );

            const newContent = '{"new": "content"}';
            transport.updateDocument(newContent);

            sinon.assert.calledOnce(applyEditStub);

            applyEditStub.restore();
        });

        test("should handle convert to python", function () {
            // noinspection DuplicatedCode
            if (!MessageTransport) {
                console.warn("Skipping ....");
                this.skip();
            }

            const mockPanel = {
                webview: {
                    onDidReceiveMessage: sandbox.stub().returns({ dispose: sandbox.spy() }),
                    postMessage: sandbox.spy(),
                },
                active: true,
            };

            // noinspection JSUnusedGlobalSymbols
            const mockDocument = {
                uri: vscode.Uri.parse("file:///test.waldiez"),
                getText: () => "{}",
                lineCount: 1,
            };
            const executeCommandStub = sandbox.stub(vscode.commands, "executeCommand").resolves();

            const transport = new MessageTransport(
                mockPanel,
                mockDocument,
                () => {},
                () => {},
                () => {},
                () => {},
            );

            transport.onConvert({ flow: '{"data": "test"}', to: "py" });

            sinon.assert.calledOnce(executeCommandStub);
            const commandCall = executeCommandStub.getCall(0);
            assert.ok(commandCall.args[0].includes("toPython"));

            executeCommandStub.restore();
        });

        test("should handle convert to ipynb", function () {
            // noinspection DuplicatedCode
            if (!MessageTransport) {
                console.warn("Skipping ....");
                this.skip();
            }

            const mockPanel = {
                webview: {
                    onDidReceiveMessage: sandbox.stub().returns({ dispose: sandbox.spy() }),
                    postMessage: sandbox.spy(),
                },
                active: true,
            };

            // noinspection JSUnusedGlobalSymbols
            const mockDocument = {
                uri: vscode.Uri.parse("file:///test.waldiez"),
                getText: () => "{}",
                lineCount: 1,
            };
            const executeCommandStub = sandbox.stub(vscode.commands, "executeCommand").resolves();

            const transport = new MessageTransport(
                mockPanel,
                mockDocument,
                () => {},
                () => {},
                () => {},
                () => {},
            );

            transport.onConvert({ flow: '{"data": "test"}', to: "ipynb" });

            sinon.assert.calledOnce(executeCommandStub);
            const commandCall = executeCommandStub.getCall(0);
            assert.ok(commandCall.args[0].includes("toIpynb"));

            executeCommandStub.restore();
        });

        test("should ask for input", function () {
            if (!MessageTransport) {
                console.warn("Skipping ....");
                this.skip();
            }

            const mockPanel = {
                webview: {
                    onDidReceiveMessage: sandbox.stub().returns({ dispose: sandbox.spy() }),
                    postMessage: sandbox.spy(),
                },
                active: true,
            };

            // noinspection JSUnusedGlobalSymbols
            const mockDocument = {
                uri: vscode.Uri.parse("file:///test.waldiez"),
                getText: () => "{}",
                lineCount: 1,
            };
            const transport = new MessageTransport(
                mockPanel,
                mockDocument,
                () => {},
                () => {},
                () => {},
                () => {},
            );

            const inputPromise = transport.askForInput({
                request_id: "test-123",
                prompt: "Enter name:",
                password: false,
            });

            assert.ok(inputPromise instanceof Promise);
            sinon.assert.calledOnce(mockPanel.webview.postMessage);

            const messageCall = mockPanel.webview.postMessage.getCall(0);
            assert.strictEqual(messageCall.args[0].type, "step_update");
            assert.deepStrictEqual(messageCall.args[0].value, {
                active: true,
                show: true,
                autoContinue: false,
                stepMode: true,
                pendingControlInput: undefined,
                activeRequest: {
                    request_id: "test-123",
                    prompt: "Enter name:",
                },
            });
        });

        test("should dispose properly", function () {
            if (!MessageTransport) {
                console.warn("Skipping ....");
                this.skip();
            }

            const disposeSpy = sandbox.spy();
            const mockPanel = {
                webview: {
                    onDidReceiveMessage: sandbox.stub().returns({ dispose: disposeSpy }),
                    postMessage: sandbox.spy(),
                },
                active: true,
            };

            // noinspection JSUnusedGlobalSymbols
            const mockDocument = {
                uri: vscode.Uri.parse("file:///test.waldiez"),
                getText: () => "{}",
                lineCount: 1,
            };
            const transport = new MessageTransport(
                mockPanel,
                mockDocument,
                () => {},
                () => {},
                () => {},
                () => {},
            );

            transport.dispose();

            sinon.assert.calledOnce(disposeSpy);
        });

        test("should get initial text from document", function () {
            if (!MessageTransport) {
                console.warn("Skipping ....");
                this.skip();
            }

            const clock = sinon.useFakeTimers();
            const mockPanel = {
                webview: {
                    onDidReceiveMessage: sandbox.stub().returns({ dispose: sandbox.spy() }),
                    postMessage: sandbox.spy(),
                },
                active: true,
            };

            const testContent = '{"test": "flow"}';
            // noinspection JSUnusedGlobalSymbols
            const mockDocument = {
                uri: vscode.Uri.parse("file:///test.waldiez"),
                getText: () => testContent,
                lineCount: 1,
            };

            const transport = new MessageTransport(
                mockPanel,
                mockDocument,
                () => {},
                () => {},
                () => {},
                () => {},
            );

            transport.onReady();

            clock.tick(150);
            sinon.assert.calledOnce(mockPanel.webview.postMessage);
            const messageCall = mockPanel.webview.postMessage.getCall(0);
            assert.strictEqual(messageCall.args[0].type, "init");
            clock.restore();
        });

        test("should get default text for empty document", function () {
            if (!MessageTransport) {
                console.warn("Skipping ....");
                this.skip();
            }
            const clock = sinon.useFakeTimers();
            const mockPanel = {
                webview: {
                    onDidReceiveMessage: sandbox.stub().returns({ dispose: sandbox.spy() }),
                    postMessage: sandbox.spy(),
                },
                active: true,
            };

            // noinspection JSUnusedGlobalSymbols
            const mockDocument = {
                uri: vscode.Uri.parse("file:///test.waldiez"),
                getText: () => "", // Empty document
                lineCount: 1,
            };

            const transport = new MessageTransport(
                mockPanel,
                mockDocument,
                () => {},
                () => {},
                () => {},
                () => {},
            );

            transport.onReady();

            clock.tick(150);

            sinon.assert.calledOnce(mockPanel.webview.postMessage);
            const messageCall = mockPanel.webview.postMessage.getCall(0);
            assert.strictEqual(messageCall.args[0].type, "init");
            assert.strictEqual(messageCall.args[0].value.flow, '{"type": "flow", "data": {}}');

            clock.restore();
        });
        test("should handle sendMessageSafe with concurrent operations", async function () {
            if (!MessageTransport) {
                console.warn("Skipping ....");
                this.skip();
            }

            const mockPanel = {
                webview: {
                    onDidReceiveMessage: sandbox.stub().returns({ dispose: sandbox.spy() }),
                    postMessage: sandbox.spy(),
                },
                active: true,
            };

            const mockDocument = {
                uri: vscode.Uri.parse("file:///test.waldiez"),
                getText: () => "{}",
                lineCount: 1,
            };

            const transport = new MessageTransport(
                mockPanel,
                mockDocument,
                () => {},
                () => {},
                () => {},
                () => {},
            );

            const message1 = { type: "test", value: "data1" };
            const message2 = { type: "test", value: "data2" };
            const operationKey = "test_operation";

            // Start two concurrent operations with the same key
            const promise1 = transport.sendMessageSafe(message1, operationKey);
            const promise2 = transport.sendMessageSafe(message2, operationKey);

            // Wait for both promises to resolve
            await Promise.all([promise1, promise2]);

            // Should have called postMessage for both messages (sequentially)
            sinon.assert.calledTwice(mockPanel.webview.postMessage);

            // Verify the messages were sent
            const firstCall = mockPanel.webview.postMessage.getCall(0);
            const secondCall = mockPanel.webview.postMessage.getCall(1);

            assert.deepStrictEqual(firstCall.args[0], message1);
            assert.deepStrictEqual(secondCall.args[0], message2);
        });

        test("should handle sendMessageSafe with inactive panel", async function () {
            if (!MessageTransport) {
                console.warn("Skipping ....");
                this.skip();
            }

            const mockPanel = {
                webview: {
                    onDidReceiveMessage: sandbox.stub().returns({ dispose: sandbox.spy() }),
                    postMessage: sandbox.spy(),
                },
                active: false, // Panel is inactive
            };

            const mockDocument = {
                uri: vscode.Uri.parse("file:///test.waldiez"),
                getText: () => "{}",
                lineCount: 1,
            };

            const transport = new MessageTransport(
                mockPanel,
                mockDocument,
                () => {},
                () => {},
                () => {},
                () => {},
            );

            const message = { type: "test", value: "data" };

            // Send message when panel is inactive
            await transport.sendMessageSafe(message);

            // Should not have called postMessage when panel is inactive
            sinon.assert.notCalled(mockPanel.webview.postMessage);
        });

        test("should handle sendMessageSafe without operation key", async function () {
            if (!MessageTransport) {
                console.warn("Skipping ....");
                this.skip();
            }

            const mockPanel = {
                webview: {
                    onDidReceiveMessage: sandbox.stub().returns({ dispose: sandbox.spy() }),
                    postMessage: sandbox.spy(),
                },
                active: true,
            };

            const mockDocument = {
                uri: vscode.Uri.parse("file:///test.waldiez"),
                getText: () => "{}",
                lineCount: 1,
            };

            const transport = new MessageTransport(
                mockPanel,
                mockDocument,
                () => {},
                () => {},
                () => {},
                () => {},
            );

            const message = { type: "update", value: "test_data" };

            // Send message without providing operation key (should generate one)
            await transport.sendMessageSafe(message);

            // Should have called postMessage with the generated key
            sinon.assert.calledOnce(mockPanel.webview.postMessage);
            sinon.assert.calledWith(mockPanel.webview.postMessage, message);
        });
        test("should handle 'ready' message", function () {
            if (!MessageTransport) {
                console.warn("Skipping ....");
                this.skip();
            }

            const clock = sinon.useFakeTimers();
            let messageHandler: any;
            const mockPanel = {
                webview: {
                    onDidReceiveMessage: sandbox.stub().callsFake(handler => {
                        messageHandler = handler;
                        return { dispose: sandbox.spy() };
                    }),
                    postMessage: sandbox.spy(),
                },
                active: true,
            };

            const mockDocument = {
                uri: vscode.Uri.parse("file:///test.waldiez"),
                getText: () => '{"test": "data"}',
                lineCount: 1,
            };

            new MessageTransport(
                mockPanel,
                mockDocument,
                () => {},
                () => {},
                () => {},
                () => {},
            );

            // Simulate receiving a 'ready' message
            messageHandler({ action: "ready" });

            clock.tick(150); // Allow debounced init message to send

            // Should have sent init message
            sinon.assert.calledOnce(mockPanel.webview.postMessage);
            const messageCall = mockPanel.webview.postMessage.getCall(0);
            assert.strictEqual(messageCall.args[0].type, "init");

            clock.restore();
        });

        test("should handle 'initialized' message", function () {
            if (!MessageTransport) {
                console.warn("Skipping ....");
                this.skip();
            }

            let messageHandler: any;
            const onInitSpy = sandbox.spy();
            const mockPanel = {
                webview: {
                    onDidReceiveMessage: sandbox.stub().callsFake(handler => {
                        messageHandler = handler;
                        return { dispose: sandbox.spy() };
                    }),
                    postMessage: sandbox.spy(),
                },
                active: true,
            };

            const mockDocument = {
                uri: vscode.Uri.parse("file:///test.waldiez"),
                getText: () => "{}",
                lineCount: 1,
            };

            new MessageTransport(
                mockPanel,
                mockDocument,
                () => {},
                () => {},
                () => {},
                onInitSpy,
            );

            // Simulate receiving an 'initialized' message
            messageHandler({ action: "initialized" });

            // Should have called onInit
            sinon.assert.calledOnce(onInitSpy);
        });

        test("should handle 'change' message", function () {
            if (!MessageTransport) {
                console.warn("Skipping ....");
                this.skip();
            }

            let messageHandler: any;
            const mockPanel = {
                webview: {
                    onDidReceiveMessage: sandbox.stub().callsFake(handler => {
                        messageHandler = handler;
                        return { dispose: sandbox.spy() };
                    }),
                    postMessage: sandbox.spy(),
                },
                active: true,
            };

            const mockDocument = {
                uri: vscode.Uri.parse("file:///test.waldiez"),
                getText: () => '{"old": "content"}',
                lineCount: 1,
            };

            const applyEditStub = sandbox.stub(vscode.workspace, "applyEdit").resolves(true);

            new MessageTransport(
                mockPanel,
                mockDocument,
                () => {},
                () => {},
                () => {},
                () => {},
            );

            const newContent = '{"new": "content"}';
            // Simulate receiving a 'change' message
            messageHandler({ action: "change", value: newContent });

            // Should have called applyEdit to update document
            sinon.assert.calledOnce(applyEditStub);

            applyEditStub.restore();
        });

        test("should handle 'run' message", async function () {
            if (!MessageTransport) {
                console.warn("Skipping ....");
                this.skip();
            }

            let messageHandler: any;
            const onRunSpy = sandbox.spy();
            const mockPanel = {
                webview: {
                    onDidReceiveMessage: sandbox.stub().callsFake(handler => {
                        messageHandler = handler;
                        return { dispose: sandbox.spy() };
                    }),
                    postMessage: sandbox.spy(),
                },
                active: true,
            };

            const mockDocument = {
                uri: vscode.Uri.parse("file:///test.waldiez"),
                getText: () => '{"old": "content"}',
                lineCount: 1,
            };

            const applyEditStub = sandbox.stub(vscode.workspace, "applyEdit").resolves(true);
            const saveStub = sandbox.stub(vscode.workspace, "save").resolves(mockDocument.uri);

            new MessageTransport(
                mockPanel,
                mockDocument,
                onRunSpy,
                () => {},
                () => {},
                () => {},
            );

            const newContent = '{"new": "content"}';
            // Simulate receiving a 'run' message
            await messageHandler({ action: "run", value: newContent });

            // Should have updated document, saved, and called onRun
            sinon.assert.calledOnce(applyEditStub);
            sinon.assert.calledOnce(saveStub);
            sinon.assert.calledOnce(onRunSpy);

            applyEditStub.restore();
            saveStub.restore();
        });

        test("should handle 'stop_request' message", function () {
            if (!MessageTransport) {
                console.warn("Skipping ....");
                this.skip();
            }

            let messageHandler: any;
            const onStopSpy = sandbox.spy();
            const mockPanel = {
                webview: {
                    onDidReceiveMessage: sandbox.stub().callsFake(handler => {
                        messageHandler = handler;
                        return { dispose: sandbox.spy() };
                    }),
                    postMessage: sandbox.spy(),
                },
                active: true,
            };

            const mockDocument = {
                uri: vscode.Uri.parse("file:///test.waldiez"),
                getText: () => "{}",
                lineCount: 1,
            };

            new MessageTransport(
                mockPanel,
                mockDocument,
                () => {},
                onStopSpy,
                () => {},
                () => {},
            );

            // Simulate receiving a 'stop_request' message
            messageHandler({ action: "stop_request" });

            // Should have called onStop
            sinon.assert.calledOnce(onStopSpy);
        });

        test("should handle 'save' message", function () {
            if (!MessageTransport) {
                console.warn("Skipping ....");
                this.skip();
            }

            let messageHandler: any;
            const mockPanel = {
                webview: {
                    onDidReceiveMessage: sandbox.stub().callsFake(handler => {
                        messageHandler = handler;
                        return { dispose: sandbox.spy() };
                    }),
                    postMessage: sandbox.spy(),
                },
                active: true,
            };

            const mockDocument = {
                uri: vscode.Uri.parse("file:///test.waldiez"),
                getText: () => '{"old": "content"}',
                lineCount: 1,
            };

            const applyEditStub = sandbox.stub(vscode.workspace, "applyEdit").resolves(true);

            new MessageTransport(
                mockPanel,
                mockDocument,
                () => {},
                () => {},
                () => {},
                () => {},
            );

            const newContent = '{"saved": "content"}';
            // Simulate receiving a 'save' message
            messageHandler({ action: "save", value: newContent });

            // Should have called applyEdit to update document
            sinon.assert.calledOnce(applyEditStub);

            applyEditStub.restore();
        });

        test("should handle 'input_response' message", function () {
            if (!MessageTransport) {
                console.warn("Skipping ....");
                this.skip();
            }

            let messageHandler: any;
            const mockPanel = {
                webview: {
                    onDidReceiveMessage: sandbox.stub().callsFake(handler => {
                        messageHandler = handler;
                        return { dispose: sandbox.spy() };
                    }),
                    postMessage: sandbox.spy(),
                },
                active: true,
            };

            const mockDocument = {
                uri: vscode.Uri.parse("file:///test.waldiez"),
                getText: () => "{}",
                lineCount: 1,
            };

            const transport = new MessageTransport(
                mockPanel,
                mockDocument,
                () => {},
                () => {},
                () => {},
                () => {},
            );

            // First, initiate an input request to set up the internal state
            const inputPromise = transport.askForInput({
                request_id: "test-123",
                prompt: "Enter value:",
            });

            // Simulate receiving an 'input_response' message
            const inputResponse = {
                request_id: "test-123",
                value: "user input",
                type: "input_response",
                data: "",
                cancelled: false,
            };
            messageHandler({ action: "input_response", value: inputResponse });

            // The input promise should resolve with the response
            return inputPromise.then((result: any) => {
                delete result.id;
                delete result.timestamp;
                assert.deepStrictEqual(result, inputResponse);
            });
        });

        test("should ignore messages without action", function () {
            if (!MessageTransport) {
                console.warn("Skipping ....");
                this.skip();
            }

            let messageHandler: any;
            const mockPanel = {
                webview: {
                    onDidReceiveMessage: sandbox.stub().callsFake(handler => {
                        messageHandler = handler;
                        return { dispose: sandbox.spy() };
                    }),
                    postMessage: sandbox.spy(),
                },
                active: true,
            };

            const mockDocument = {
                uri: vscode.Uri.parse("file:///test.waldiez"),
                getText: () => "{}",
                lineCount: 1,
            };

            new MessageTransport(
                mockPanel,
                mockDocument,
                () => {},
                () => {},
                () => {},
                () => {},
            );

            // Simulate receiving a message without action
            messageHandler({ someProperty: "value" });

            // Should not have called postMessage (no response expected)
            sinon.assert.notCalled(mockPanel.webview.postMessage);
        });

        test("should ignore messages when panel inactive", function () {
            if (!MessageTransport) {
                console.warn("Skipping ....");
                this.skip();
            }

            let messageHandler: any;
            const onInitSpy = sandbox.spy();
            const mockPanel = {
                webview: {
                    onDidReceiveMessage: sandbox.stub().callsFake(handler => {
                        messageHandler = handler;
                        return { dispose: sandbox.spy() };
                    }),
                    postMessage: sandbox.spy(),
                },
                active: false, // Panel inactive
            };

            const mockDocument = {
                uri: vscode.Uri.parse("file:///test.waldiez"),
                getText: () => "{}",
                lineCount: 1,
            };

            new MessageTransport(
                mockPanel,
                mockDocument,
                () => {},
                () => {},
                () => {},
                onInitSpy,
            );

            // Simulate receiving an 'initialized' message when panel is inactive
            messageHandler({ action: "initialized" });

            // Should not have called onInit when panel is inactive
            sinon.assert.notCalled(onInitSpy);
        });

        test("should save file with workspace folder when not file scheme", async function () {
            if (!MessageTransport) {
                console.warn("Skipping ....");
                this.skip();
            }

            const mockPanel = {
                webview: {
                    onDidReceiveMessage: sandbox.stub().returns({ dispose: sandbox.spy() }),
                    postMessage: sandbox.spy(),
                },
                active: true,
            };

            const mockDocument = {
                uri: vscode.Uri.parse("vscode-vfs://test/document.waldiez"), // Non-file scheme
                getText: () => "{}",
                lineCount: 1,
            };

            const mockWorkspaceFolder = {
                uri: vscode.Uri.parse("file:///workspace"),
                name: "test-workspace",
                index: 0,
            };

            const workspaceFoldersStub = sandbox
                .stub(vscode.workspace, "workspaceFolders")
                .value([mockWorkspaceFolder]);

            const mockWriteFile = sandbox.stub().resolves();
            const originalFs = vscode.workspace.fs;
            sandbox.stub(vscode.workspace, "fs").value({
                ...originalFs,
                writeFile: mockWriteFile,
            });

            const executeCommandStub = sandbox.stub(vscode.commands, "executeCommand").resolves();

            const transport = new MessageTransport(
                mockPanel,
                mockDocument,
                () => {},
                () => {},
                () => {},
                () => {},
            );

            const testFile = {
                name: "workspace-test.txt",
                content: Buffer.from("Workspace content").toString("base64"),
            };

            const result = await (transport as any)._saveFile(testFile);

            // Should return the workspace-based file path
            assert.ok(result);
            assert.ok(result.includes("workspace-test.txt"));
            assert.ok(result.includes("workspace"));

            sinon.assert.calledOnce(mockWriteFile);
            sinon.assert.calledWith(executeCommandStub, "workbench.files.action.refreshFilesExplorer");

            workspaceFoldersStub.restore();
            executeCommandStub.restore();
        });

        test("should handle file save error", async function () {
            if (!MessageTransport) {
                console.warn("Skipping ....");
                this.skip();
            }

            const mockPanel = {
                webview: {
                    onDidReceiveMessage: sandbox.stub().returns({ dispose: sandbox.spy() }),
                    postMessage: sandbox.spy(),
                },
                active: true,
            };

            const mockDocument = {
                uri: vscode.Uri.parse("file:///test/document.waldiez"),
                getText: () => "{}",
                lineCount: 1,
            };

            const testError = new Error("Permission denied");
            const mockWriteFile = sandbox.stub().rejects(testError);
            const originalFs = vscode.workspace.fs;
            sandbox.stub(vscode.workspace, "fs").value({
                ...originalFs,
                writeFile: mockWriteFile,
            });

            const transport = new MessageTransport(
                mockPanel,
                mockDocument,
                () => {},
                () => {},
                () => {},
                () => {},
            );

            const testFile = {
                name: "error-test.txt",
                content: Buffer.from("Test content").toString("base64"),
            };

            const result = await (transport as any)._saveFile(testFile);

            // Should return null on error
            assert.strictEqual(result, null, "Should return null on error");

            // Should have attempted to write file
            sinon.assert.calledOnce(mockWriteFile);
        });

        test("should handle upload message with files", async function () {
            if (!MessageTransport) {
                console.warn("Skipping ....");
                this.skip();
            }

            let messageHandler: any;
            const mockPanel = {
                webview: {
                    onDidReceiveMessage: sandbox.stub().callsFake(handler => {
                        messageHandler = handler;
                        return { dispose: sandbox.spy() };
                    }),
                    postMessage: sandbox.spy(),
                },
                active: true,
            };

            const mockDocument = {
                uri: vscode.Uri.parse("file:///test/document.waldiez"),
                getText: () => "{}",
                lineCount: 1,
            };

            const mockWriteFile = sandbox.stub().resolves();
            const originalFs = vscode.workspace.fs;
            sandbox.stub(vscode.workspace, "fs").value({
                ...originalFs,
                writeFile: mockWriteFile,
            });

            const executeCommandStub = sandbox.stub(vscode.commands, "executeCommand").resolves();

            new MessageTransport(
                mockPanel,
                mockDocument,
                () => {},
                () => {},
                () => {},
                () => {},
            );

            const uploadMessage = {
                action: "upload",
                value: [
                    {
                        name: "file1.txt",
                        content: Buffer.from("Content 1").toString("base64"),
                    },
                ],
            };

            // Simulate upload message
            await messageHandler(uploadMessage);

            // Should have written the file
            sinon.assert.calledOnce(mockWriteFile);

            // Should have called refresh command
            sinon.assert.calledWith(executeCommandStub, "workbench.files.action.refreshFilesExplorer");

            executeCommandStub.restore();
        });

        test("should handle upload with file save error", async function () {
            if (!MessageTransport) {
                console.warn("Skipping ....");
                this.skip();
            }

            let messageHandler: any;
            const mockPanel = {
                webview: {
                    onDidReceiveMessage: sandbox.stub().callsFake(handler => {
                        messageHandler = handler;
                        return { dispose: sandbox.spy() };
                    }),
                    postMessage: sandbox.spy(),
                },
                active: true,
            };

            const mockDocument = {
                uri: vscode.Uri.parse("file:///test/document.waldiez"),
                getText: () => "{}",
                lineCount: 1,
            };

            // Mock writeFile to fail
            const mockWriteFile = sandbox.stub().rejects(new Error("Disk full"));
            const originalFs = vscode.workspace.fs;
            sandbox.stub(vscode.workspace, "fs").value({
                ...originalFs,
                writeFile: mockWriteFile,
            });

            new MessageTransport(
                mockPanel,
                mockDocument,
                () => {},
                () => {},
                () => {},
                () => {},
            );

            const uploadMessage = {
                action: "upload",
                value: [
                    {
                        name: "failure.txt",
                        content: Buffer.from("Failure").toString("base64"),
                    },
                ],
            };

            await messageHandler(uploadMessage);

            // Should have attempted to write the file
            sinon.assert.calledOnce(mockWriteFile);
        });

        test("should use correct file destination based on scheme", async function () {
            if (!MessageTransport) {
                console.warn("Skipping ....");
                this.skip();
            }

            const mockPanel = {
                webview: {
                    onDidReceiveMessage: sandbox.stub().returns({ dispose: sandbox.spy() }),
                    postMessage: sandbox.spy(),
                },
                active: true,
            };

            const mockDocument = {
                uri: vscode.Uri.parse("file:///test/subfolder/document.waldiez"),
                getText: () => "{}",
                lineCount: 1,
            };

            const mockWriteFile = sandbox.stub().resolves();
            const originalFs = vscode.workspace.fs;
            sandbox.stub(vscode.workspace, "fs").value({
                ...originalFs,
                writeFile: mockWriteFile,
            });

            const executeCommandStub = sandbox.stub(vscode.commands, "executeCommand").resolves();

            const transport = new MessageTransport(
                mockPanel,
                mockDocument,
                () => {},
                () => {},
                () => {},
                () => {},
            );

            const testFile = {
                name: "sibling.txt",
                content: Buffer.from("Test").toString("base64"),
            };

            await (transport as any)._saveFile(testFile);

            // Verify the file was written to the correct location (sibling to document)
            sinon.assert.calledOnce(mockWriteFile);
            const writeCall = mockWriteFile.getCall(0);
            const destinationUri = writeCall.args[0];

            // Should be in the parent directory of the document
            // The logic uses vscode.Uri.joinPath(this.document.uri, "..", file.name)
            // which should create /test/sibling.txt from /test/subfolder/document.waldiez
            console.log("Destination path:", destinationUri.path);
            assert.ok(
                destinationUri.path.endsWith("/sibling.txt"),
                `Expected path to end with /sibling.txt, got: ${destinationUri.path}`,
            );
            assert.ok(
                destinationUri.path.includes("/test/"),
                `Expected path to include /test/, got: ${destinationUri.path}`,
            );

            executeCommandStub.restore();
        });
    });
});
