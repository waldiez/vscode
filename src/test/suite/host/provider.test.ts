/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2024 - 2025 Waldiez & contributors
 */
/* eslint-disable max-lines-per-function */
import * as assert from "assert";
import { afterEach, before, beforeEach, suite, test } from "mocha";
import * as sinon from "sinon";
import * as vscode from "vscode";

import packageJSON from "../../../../package.json";

const extensionId = `${packageJSON.publisher}.${packageJSON.name}`;

suite("WaldiezEditorProvider Tests", () => {
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

    suite("WaldiezEditorProvider", () => {
        let WaldiezEditorProvider: any;

        before(async () => {
            try {
                const module = await import("../../../host/provider");
                WaldiezEditorProvider = module.WaldiezEditorProvider;
            } catch (error) {
                console.warn("Could not import WaldiezEditorProvider:", error);
            }
        });

        test("should create provider instance", function () {
            // noinspection DuplicatedCode
            if (!WaldiezEditorProvider) {
                console.warn("Skipping ....");
                this.skip();
            }

            const mockContext = {
                subscriptions: [],
                extensionUri: vscode.Uri.parse("file:///extension"),
            };

            // noinspection JSUnusedGlobalSymbols
            const mockRunner = {
                wrapper: {
                    setOnChangePythonInterpreter: sandbox.spy(),
                    pythonVersionString: () => "Python 3.11.0",
                    executable: "/usr/bin/python3",
                },
            };

            const registerStub = sandbox
                .stub(vscode.window, "registerCustomEditorProvider")
                .returns({ dispose: sandbox.spy() } as any);
            const createStatusBarStub = sandbox.stub(vscode.window, "createStatusBarItem").returns({
                text: "",
                tooltip: "",
                command: "",
                show: sandbox.spy(),
                hide: sandbox.spy(),
                dispose: sandbox.spy(),
            } as any);

            const provider = new WaldiezEditorProvider(mockContext as any, mockRunner as any);

            assert.ok(provider);
            sinon.assert.calledOnce(registerStub);
            sinon.assert.calledWith(registerStub, WaldiezEditorProvider.viewType, provider);
            sinon.assert.calledOnce(createStatusBarStub);

            registerStub.restore();
            createStatusBarStub.restore();
        });

        test("should initialize with new runner", function () {
            // noinspection DuplicatedCode
            if (!WaldiezEditorProvider) {
                console.warn("Skipping ....");
                this.skip();
            }

            const mockContext = {
                subscriptions: [],
                extensionUri: vscode.Uri.parse("file:///extension"),
            };

            // noinspection JSUnusedGlobalSymbols
            const mockRunner = {
                wrapper: {
                    setOnChangePythonInterpreter: sandbox.spy(),
                    pythonVersionString: () => "Python 3.11.0",
                    executable: "/usr/bin/python3",
                },
            };

            const registerStub = sandbox
                .stub(vscode.window, "registerCustomEditorProvider")
                .returns({ dispose: sandbox.spy() } as any);
            const statusBarItem = {
                text: "",
                tooltip: "",
                command: "",
                show: sandbox.spy(),
                hide: sandbox.spy(),
                dispose: sandbox.spy(),
            };
            const createStatusBarStub = sandbox
                .stub(vscode.window, "createStatusBarItem")
                .returns(statusBarItem as any);

            const provider = new WaldiezEditorProvider(mockContext as any, mockRunner as any);

            // noinspection JSUnusedGlobalSymbols
            const newMockRunner = {
                wrapper: {
                    setOnChangePythonInterpreter: sandbox.spy(),
                    pythonVersionString: () => "Python 3.12.0",
                    executable: "/usr/bin/python3.12",
                },
            };

            provider.initialize(newMockRunner as any);

            sinon.assert.calledOnce(newMockRunner.wrapper.setOnChangePythonInterpreter);
            sinon.assert.calledOnce(statusBarItem.show);

            registerStub.restore();
            createStatusBarStub.restore();
        });

        test("should handle Python interpreter changes - invalid", function () {
            if (!WaldiezEditorProvider) {
                console.warn("Skipping ....");
                this.skip();
            }

            const mockContext = {
                subscriptions: [],
                extensionUri: vscode.Uri.parse("file:///extension"),
            };

            // noinspection JSUnusedGlobalSymbols
            const mockRunner = {
                wrapper: {
                    setOnChangePythonInterpreter: sandbox.spy(),
                    pythonVersionString: () => "Python 2.7.0",
                    executable: "/usr/bin/python2",
                },
            };

            const registerStub = sandbox
                .stub(vscode.window, "registerCustomEditorProvider")
                .returns({ dispose: sandbox.spy() } as any);
            const createStatusBarStub = sandbox.stub(vscode.window, "createStatusBarItem").returns({
                text: "",
                tooltip: "",
                command: "",
                show: sandbox.spy(),
                hide: sandbox.spy(),
                dispose: sandbox.spy(),
            } as any);
            const showWarningStub = sandbox.stub(vscode.window, "showWarningMessage").resolves();
            const executeCommandStub = sandbox.stub(vscode.commands, "executeCommand").resolves();

            const provider = new WaldiezEditorProvider(mockContext as any, mockRunner as any);

            (provider as any)._onChangedPythonInterpreter(false);

            sinon.assert.calledOnce(showWarningStub);
            sinon.assert.calledWith(
                showWarningStub,
                "Please select a valid Python interpreter (>=3.10, <3.14)",
            );
            sinon.assert.calledWith(executeCommandStub, "python.setInterpreter");

            registerStub.restore();
            createStatusBarStub.restore();
            showWarningStub.restore();
            executeCommandStub.restore();
        });

        test("should handle Python interpreter changes - valid", function () {
            // noinspection DuplicatedCode
            if (!WaldiezEditorProvider) {
                console.warn("Skipping ....");
                this.skip();
            }

            const mockContext = {
                subscriptions: [],
                extensionUri: vscode.Uri.parse("file:///extension"),
            };

            // noinspection JSUnusedGlobalSymbols
            const mockRunner = {
                wrapper: {
                    setOnChangePythonInterpreter: sandbox.spy(),
                    pythonVersionString: () => "Python 3.11.0",
                    executable: "/usr/bin/python3",
                },
            };

            const registerStub = sandbox
                .stub(vscode.window, "registerCustomEditorProvider")
                .returns({ dispose: sandbox.spy() } as any);
            const statusBarItem = {
                text: "",
                tooltip: "",
                command: "",
                show: sandbox.spy(),
                hide: sandbox.spy(),
                dispose: sandbox.spy(),
            };
            const createStatusBarStub = sandbox
                .stub(vscode.window, "createStatusBarItem")
                .returns(statusBarItem as any);

            const provider = new WaldiezEditorProvider(mockContext as any, mockRunner as any);

            (provider as any)._onChangedPythonInterpreter(true);

            // Should update status bar for valid interpreter
            assert.ok(statusBarItem.text.includes("Python"));

            registerStub.restore();
            createStatusBarStub.restore();
        });

        test("should update status bar item", function () {
            // noinspection DuplicatedCode
            if (!WaldiezEditorProvider) {
                console.warn("Skipping ....");
                this.skip();
            }

            const mockContext = {
                subscriptions: [],
                extensionUri: vscode.Uri.parse("file:///extension"),
            };

            // noinspection JSUnusedGlobalSymbols
            const mockRunner = {
                wrapper: {
                    setOnChangePythonInterpreter: sandbox.spy(),
                    pythonVersionString: () => "Python 3.11.0",
                    executable: "/usr/bin/python3",
                },
            };

            const registerStub = sandbox
                .stub(vscode.window, "registerCustomEditorProvider")
                .returns({ dispose: sandbox.spy() } as any);
            const statusBarItem = {
                text: "",
                tooltip: "",
                command: "",
                show: sandbox.spy(),
                hide: sandbox.spy(),
                dispose: sandbox.spy(),
            };
            const createStatusBarStub = sandbox
                .stub(vscode.window, "createStatusBarItem")
                .returns(statusBarItem as any);

            const provider = new WaldiezEditorProvider(mockContext as any, mockRunner as any);

            (provider as any)._updateStatusBarItem();

            assert.strictEqual(statusBarItem.text, "Python: Python 3.11.0");
            assert.strictEqual(statusBarItem.tooltip, "/usr/bin/python3");

            registerStub.restore();
            createStatusBarStub.restore();
        });

        test("should show status bar item", function () {
            // noinspection DuplicatedCode
            if (!WaldiezEditorProvider) {
                console.warn("Skipping ....");
                this.skip();
            }

            const mockContext = {
                subscriptions: [],
                extensionUri: vscode.Uri.parse("file:///extension"),
            };

            // noinspection JSUnusedGlobalSymbols
            const mockRunner = {
                wrapper: {
                    setOnChangePythonInterpreter: sandbox.spy(),
                    pythonVersionString: () => "Python 3.11.0",
                    executable: "/usr/bin/python3",
                },
            };

            const registerStub = sandbox
                .stub(vscode.window, "registerCustomEditorProvider")
                .returns({ dispose: sandbox.spy() } as any);
            const statusBarItem = {
                text: "",
                tooltip: "",
                command: "",
                show: sandbox.spy(),
                hide: sandbox.spy(),
                dispose: sandbox.spy(),
            };
            const createStatusBarStub = sandbox
                .stub(vscode.window, "createStatusBarItem")
                .returns(statusBarItem as any);

            const provider = new WaldiezEditorProvider(mockContext as any, mockRunner as any);

            (provider as any)._showStatusBarItem();

            sinon.assert.calledOnce(statusBarItem.show);

            registerStub.restore();
            createStatusBarStub.restore();
        });

        test("should generate webview content", function () {
            // noinspection DuplicatedCode
            if (!WaldiezEditorProvider) {
                console.warn("Skipping ....");
                this.skip();
            }

            const mockContext = {
                subscriptions: [],
                extensionUri: vscode.Uri.parse("file:///extension"),
            };

            // noinspection JSUnusedGlobalSymbols
            const mockRunner = {
                wrapper: {
                    setOnChangePythonInterpreter: sandbox.spy(),
                    pythonVersionString: () => "Python 3.11.0",
                    executable: "/usr/bin/python3",
                },
            };

            const registerStub = sandbox
                .stub(vscode.window, "registerCustomEditorProvider")
                .returns({ dispose: sandbox.spy() } as any);
            const createStatusBarStub = sandbox.stub(vscode.window, "createStatusBarItem").returns({
                text: "",
                tooltip: "",
                command: "",
                show: sandbox.spy(),
                hide: sandbox.spy(),
                dispose: sandbox.spy(),
            } as any);

            const provider = new WaldiezEditorProvider(mockContext as any, mockRunner as any);

            const mockWebview = {
                cspSource: "vscode-webview:",
                asWebviewUri: sandbox.stub().callsFake(uri => uri),
            };

            const content = (provider as any)._getWebviewContent(mockWebview);

            assert.ok(typeof content === "string");
            assert.ok(content.includes("<!DOCTYPE html>"));
            assert.ok(content.includes('<div id="root"></div>'));
            assert.ok(content.includes("Waldiez"));
            assert.ok(content.includes("Content-Security-Policy"));

            registerStub.restore();
            createStatusBarStub.restore();
        });

        test("should dispose properly", function () {
            // noinspection DuplicatedCode
            if (!WaldiezEditorProvider) {
                console.warn("Skipping ....");
                this.skip();
            }

            const mockContext = {
                subscriptions: [],
                extensionUri: vscode.Uri.parse("file:///extension"),
            };

            // noinspection JSUnusedGlobalSymbols
            const mockRunner = {
                wrapper: {
                    setOnChangePythonInterpreter: sandbox.spy(),
                    pythonVersionString: () => "Python 3.11.0",
                    executable: "/usr/bin/python3",
                },
            };

            const registerStub = sandbox
                .stub(vscode.window, "registerCustomEditorProvider")
                .returns({ dispose: sandbox.spy() } as any);
            const statusBarItem = {
                text: "",
                tooltip: "",
                command: "",
                show: sandbox.spy(),
                hide: sandbox.spy(),
                dispose: sandbox.spy(),
            };
            const createStatusBarStub = sandbox
                .stub(vscode.window, "createStatusBarItem")
                .returns(statusBarItem as any);

            const provider = new WaldiezEditorProvider(mockContext as any, mockRunner as any);

            provider.dispose();

            sinon.assert.calledOnce(statusBarItem.dispose);

            registerStub.restore();
            createStatusBarStub.restore();
        });

        test("should have correct view type", function () {
            if (!WaldiezEditorProvider) {
                console.warn("Skipping ....");
                this.skip();
            }

            assert.strictEqual(WaldiezEditorProvider.viewType, "waldiez.flow");
        });
    });
});
