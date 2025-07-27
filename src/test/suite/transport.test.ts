/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2024 - 2025 Waldiez & contributors
 */
/* eslint-disable max-lines-per-function */
import * as assert from "assert";
import { afterEach, before, beforeEach, suite, test } from "mocha";
import * as sinon from "sinon";
import * as vscode from "vscode";

import packageJSON from "../../../package.json";

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
                const module = await import("../../host/messaging/transport");
                MessageTransport = module.MessageTransport;
            } catch (error) {
                console.warn("Could not import MessageTransport:", error);
            }
        });

        test("should create transport instance", function () {
            if (!MessageTransport) {
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

            const transport = new MessageTransport(mockPanel, mockDocument, onRun, onStop, onInit);

            assert.ok(transport);
        });

        test("should return webview URI", function () {
            if (!MessageTransport) {
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
            );

            const testUri = vscode.Uri.parse("file:///test.png");
            transport.asWebviewUri(testUri);

            sinon.assert.calledWith(mockPanel.webview.asWebviewUri, testUri);
        });

        test("should send message when panel is active", function () {
            if (!MessageTransport) {
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
            );

            transport.sendMessage({ type: "init", value: "data" });

            clock.tick(100);

            // Should eventually call postMessage (might be debounced)
            sinon.assert.calledOnce(mockPanel.webview.postMessage);

            clock.restore();
        });

        test("should not send message when panel inactive", function () {
            if (!MessageTransport) {
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
            );

            transport.sendMessage({ type: "test", value: "data" });

            sinon.assert.notCalled(mockPanel.webview.postMessage);
        });

        test("should skip document update if content is same", function () {
            if (!MessageTransport) {
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
            );

            transport.updateDocument(currentContent); // Same content

            sinon.assert.notCalled(applyEditStub);

            applyEditStub.restore();
        });

        test("should update document with different content", function () {
            if (!MessageTransport) {
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
            );

            const newContent = '{"new": "content"}';
            transport.updateDocument(newContent);

            sinon.assert.calledOnce(applyEditStub);

            applyEditStub.restore();
        });

        test("should handle convert to python", function () {
            // noinspection DuplicatedCode
            if (!MessageTransport) {
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
            );

            transport.onConvert({ flow: '{"data": "test"}', to: "ipynb" });

            sinon.assert.calledOnce(executeCommandStub);
            const commandCall = executeCommandStub.getCall(0);
            assert.ok(commandCall.args[0].includes("toIpynb"));

            executeCommandStub.restore();
        });

        test("should ask for input", function () {
            if (!MessageTransport) {
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
            );

            const inputPromise = transport.askForInput({
                request_id: "test-123",
                prompt: "Enter name:",
                password: false,
            });

            assert.ok(inputPromise instanceof Promise);
            sinon.assert.calledOnce(mockPanel.webview.postMessage);

            const messageCall = mockPanel.webview.postMessage.getCall(0);
            assert.strictEqual(messageCall.args[0].type, "input_request");
            assert.deepStrictEqual(messageCall.args[0].value, {
                request_id: "test-123",
                prompt: "Enter name:",
                password: false,
            });
        });

        test("should dispose properly", function () {
            if (!MessageTransport) {
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
            );

            transport.dispose();

            sinon.assert.calledOnce(disposeSpy);
        });

        test("should get initial text from document", function () {
            if (!MessageTransport) {
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
            );

            transport.onReady();

            clock.tick(150);

            sinon.assert.calledOnce(mockPanel.webview.postMessage);
            const messageCall = mockPanel.webview.postMessage.getCall(0);
            assert.strictEqual(messageCall.args[0].type, "init");
            assert.strictEqual(messageCall.args[0].value.flow, '{"type": "flow", "data": {}}');

            clock.restore();
        });
    });
});
