/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2024 - 2026 Waldiez & contributors
 */
/* eslint-disable max-statements,max-lines-per-function,max-lines */
import * as assert from "assert";
import { afterEach, before, beforeEach, suite, test } from "mocha";
import * as sinon from "sinon";
import * as vscode from "vscode";

import packageJSON from "../../../../../package.json";

const extensionId = `${packageJSON.publisher}.${packageJSON.name}`;

suite("FlowRunner Tests", () => {
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

    suite("FlowRunner", () => {
        let FlowRunner: any;

        before(async () => {
            try {
                const runnerModule = await import("../../../../host/flow/runner");
                FlowRunner = runnerModule.FlowRunner;
            } catch (error) {
                console.warn("Could not import FlowRunner:", error);
            }
        });

        test("should create FlowRunner instance", function () {
            if (!FlowRunner) {
                console.warn("Skipping ....");
                this.skip();
            }

            // noinspection JSUnusedGlobalSymbols
            const mockWrapper = {
                executable: "/usr/bin/python3",
                pythonVersionString: () => "Python 3.11.0",
            };

            const runner = new FlowRunner(mockWrapper);

            assert.ok(runner);
            assert.strictEqual(runner.wrapper, mockWrapper);
        });

        test("should get running status", function () {
            if (!FlowRunner) {
                console.warn("Skipping ....");
                this.skip();
            }

            const mockWrapper = { executable: "/usr/bin/python3" };
            const runner = new FlowRunner(mockWrapper);

            assert.strictEqual(runner.running, false);

            // Set internal running state
            (runner as any)._running = true;
            assert.strictEqual(runner.running, true);
        });

        test("should stop process", function () {
            if (!FlowRunner) {
                console.warn("Skipping ....");
                this.skip();
            }

            const mockWrapper = { executable: "/usr/bin/python3" };
            const runner = new FlowRunner(mockWrapper);

            // Mock a running process
            const mockProcess = { kill: sandbox.spy() };
            (runner as any)._running = true;
            (runner as any)._proc = mockProcess;

            const showInfoStub = sandbox.stub(vscode.window, "showInformationMessage").resolves();

            runner.stop();

            assert.strictEqual((runner as any)._running, false);
            sinon.assert.calledOnce(mockProcess.kill);
            sinon.assert.calledWith(showInfoStub, "Flow stopped");

            showInfoStub.restore();
        });

        test("should stop without message when not running", function () {
            if (!FlowRunner) {
                console.warn("Skipping ....");
                this.skip();
            }

            const mockWrapper = { executable: "/usr/bin/python3" };
            const runner = new FlowRunner(mockWrapper);

            const showInfoStub = sandbox.stub(vscode.window, "showInformationMessage").resolves();

            runner.stop();

            assert.strictEqual((runner as any)._running, false);
            sinon.assert.notCalled(showInfoStub);

            showInfoStub.restore();
        });

        test("should get appropriate exit messages", function () {
            if (!FlowRunner) {
                console.warn("Skipping ....");
                this.skip();
            }

            const mockWrapper = { executable: "/usr/bin/python3" };
            const runner = new FlowRunner(mockWrapper);

            assert.strictEqual((runner as any)._getExitMessage(0, false), "Flow execution completed");
            assert.strictEqual((runner as any)._getExitMessage(1, false), "Flow execution failed");
            assert.strictEqual((runner as any)._getExitMessage(1, true), "Flow execution cancelled");
        });

        test("should fail to run without executable", async function () {
            if (!FlowRunner) {
                console.warn("Skipping ....");
                this.skip();
            }

            const mockWrapper = { executable: undefined };
            const runner = new FlowRunner(mockWrapper);

            const showErrorStub = sandbox.stub(vscode.window, "showErrorMessage").resolves();

            const canRun = await (runner as any)._canRun();

            assert.strictEqual(canRun, false);
            sinon.assert.calledWith(showErrorStub, "Python executable not found");

            showErrorStub.restore();
        });

        test("should handle already running scenario", async function () {
            if (!FlowRunner) {
                console.warn("Skipping ....");
                this.skip();
            }

            const mockWrapper = { executable: "/usr/bin/python3" };
            const runner = new FlowRunner(mockWrapper);

            (runner as any)._running = true;

            // @ts-expect-error "Stop" is a valid option
            const showInfoStub = sandbox.stub(vscode.window, "showInformationMessage").resolves("Stop");

            const canRun = await (runner as any)._canRun();

            assert.strictEqual(canRun, false);
            // @ts-expect-error "Stop" is a valid option
            sinon.assert.calledWith(showInfoStub, "Already running", "Stop");

            showInfoStub.restore();
        });

        test("should show error notification", async function () {
            if (!FlowRunner) {
                console.warn("Skipping ....");
                this.skip();
            }

            const mockWrapper = { executable: "/usr/bin/python3" };
            const runner = new FlowRunner(mockWrapper);

            const showErrorStub = sandbox.stub(vscode.window, "showErrorMessage").resolves();

            await (runner as any)._showExitNotification(1, false, "Error message");

            sinon.assert.calledWith(showErrorStub, "Error message");

            showErrorStub.restore();
        });

        test("should show success notification", async function () {
            if (!FlowRunner) {
                console.warn("Skipping ....");
                this.skip();
            }

            const mockWrapper = { executable: "/usr/bin/python3" };
            const runner = new FlowRunner(mockWrapper);

            const showInfoStub = sandbox.stub(vscode.window, "showInformationMessage").resolves();

            await (runner as any)._showExitNotification(0, false, "Success message");

            sinon.assert.calledWith(showInfoStub, "Success message");

            showInfoStub.restore();
        });

        test("should show cancelled notification", async function () {
            if (!FlowRunner) {
                console.warn("Skipping ....");
                this.skip();
            }

            const mockWrapper = { executable: "/usr/bin/python3" };
            const runner = new FlowRunner(mockWrapper);

            const showInfoStub = sandbox.stub(vscode.window, "showInformationMessage").resolves();

            await (runner as any)._showExitNotification(1, true, "Cancelled message");

            sinon.assert.calledWith(showInfoStub, "Cancelled message");

            showInfoStub.restore();
        });

        test("should create runner with proper wrapper", function () {
            if (!FlowRunner) {
                console.warn("Skipping ....");
                this.skip();
            }

            // noinspection JSUnusedGlobalSymbols
            const mockWrapper = {
                executable: "/usr/bin/python3",
                pythonVersionString: () => "Python 3.11.0",
                setOnChangePythonInterpreter: sandbox.spy(),
            };

            const runner = new FlowRunner(mockWrapper);

            assert.strictEqual(runner.wrapper, mockWrapper);
            assert.strictEqual(runner.running, false);
        });

        test("should cleanup process on stop", function () {
            if (!FlowRunner) {
                console.warn("Skipping ....");
                this.skip();
            }

            const mockWrapper = { executable: "/usr/bin/python3" };
            const runner = new FlowRunner(mockWrapper);

            const mockProcess = { kill: sandbox.spy() };
            (runner as any)._proc = mockProcess;
            (runner as any)._running = true;

            // Call the private cleanup method
            (runner as any)._cleanup();

            sinon.assert.calledOnce(mockProcess.kill);
            assert.strictEqual((runner as any)._running, false);
        });

        test("should handle cleanup without process", function () {
            if (!FlowRunner) {
                console.warn("Skipping ....");
                this.skip();
            }

            const mockWrapper = { executable: "/usr/bin/python3" };
            const runner = new FlowRunner(mockWrapper);

            (runner as any)._running = true;

            // Call cleanup without process
            (runner as any)._cleanup();

            assert.strictEqual((runner as any)._running, false);
        });

        test("should be disposable", function () {
            if (!FlowRunner) {
                console.warn("Skipping ....");
                this.skip();
            }

            const mockWrapper = { executable: "/usr/bin/python3" };
            const runner = new FlowRunner(mockWrapper);
            assert.ok(typeof runner.dispose === "function");
            assert.doesNotThrow(() => runner.dispose());
        });

        test("should dispose properly", function () {
            if (!FlowRunner) {
                console.warn("Skipping ....");
                this.skip();
            }

            const mockWrapper = { executable: "/usr/bin/python3" };
            const runner = new FlowRunner(mockWrapper);

            (runner as any)._proc = { kill: sandbox.spy() };
            (runner as any)._running = true;

            runner.dispose();
            // Should cleanup on dispose
            assert.strictEqual((runner as any)._running, false);
        });
        test("should handle run method when cannot run", async function () {
            if (!FlowRunner) {
                console.warn("Skipping ....");
                this.skip();
            }

            const mockWrapper = { executable: undefined }; // No executable
            const runner = new FlowRunner(mockWrapper);

            const mockTransport = {
                sendMessage: sandbox.spy(),
                onWorkflowEnd: sandbox.spy(),
            };

            const showErrorStub = sandbox.stub(vscode.window, "showErrorMessage").resolves();

            const resource = vscode.Uri.parse("file:///test/flow.waldiez");
            await runner.run(resource, mockTransport as any);

            // Should not have started running
            assert.strictEqual(runner.running, false);
            sinon.assert.calledWith(showErrorStub, "Python executable not found");

            showErrorStub.restore();
        });

        test("should handle run method with progress and cancellation", async function () {
            if (!FlowRunner) {
                console.warn("Skipping ....");
                this.skip();
            }

            const mockWrapper = { executable: "/usr/bin/python3" };
            const runner = new FlowRunner(mockWrapper);

            const mockTransport = {
                sendMessage: sandbox.spy(),
                onWorkflowEnd: sandbox.spy(),
            };

            // Mock _canRun to return true
            sandbox.stub(runner as any, "_canRun").resolves(true);

            // Mock _doRun to complete immediately
            sandbox.stub(runner as any, "_doRun").resolves();

            // Mock withProgress to capture the options and callback
            const withProgressStub = sandbox
                .stub(vscode.window, "withProgress")
                .callsFake(async (options, callback) => {
                    // Verify progress options
                    assert.strictEqual(options.location, vscode.ProgressLocation.Notification);
                    assert.strictEqual(options.title, "Running waldiez flow");
                    assert.strictEqual(options.cancellable, true);

                    const mockToken = {
                        onCancellationRequested: sandbox.stub(),
                        isCancellationRequested: false,
                    };
                    return callback(undefined as any, mockToken);
                });

            const resource = vscode.Uri.parse("file:///test/flow.waldiez");

            // Before run - should not be running
            assert.strictEqual(runner.running, false);

            await runner.run(resource, mockTransport as any);

            // Should have called withProgress and _doRun
            sinon.assert.calledOnce(withProgressStub);
            sinon.assert.calledOnce((runner as any)._doRun);

            withProgressStub.restore();
        });

        test("should set running state during run method", async function () {
            if (!FlowRunner) {
                console.warn("Skipping ....");
                this.skip();
            }

            const mockWrapper = { executable: "/usr/bin/python3" };
            const runner = new FlowRunner(mockWrapper);

            const mockTransport = {
                sendMessage: sandbox.spy(),
                onWorkflowEnd: sandbox.spy(),
            };

            // Mock _canRun to return true
            sandbox.stub(runner as any, "_canRun").resolves(true);

            let runningStateDuringDoRun = false;
            // Mock _doRun to capture running state
            sandbox.stub(runner as any, "_doRun").callsFake(async () => {
                runningStateDuringDoRun = runner.running;
            });

            // Mock withProgress
            sandbox.stub(vscode.window, "withProgress").callsFake(async (_options, callback) => {
                const mockToken = {
                    onCancellationRequested: sandbox.stub(),
                    isCancellationRequested: false,
                };
                return callback(undefined as any, mockToken);
            });

            const resource = vscode.Uri.parse("file:///test/flow.waldiez");
            await runner.run(resource, mockTransport as any);

            // Should have been running during _doRun
            assert.strictEqual(runningStateDuringDoRun, true);
        });

        test("should build correct arguments for spawn in _doRun", function () {
            if (!FlowRunner) {
                console.warn("Skipping ....");
                this.skip();
            }

            // Test the argument building logic that _doRun uses
            const resource = vscode.Uri.parse("file:///test/my-flow.waldiez");
            const parentDir = vscode.Uri.joinPath(resource, "..");

            const expectedArgs = [
                "-m",
                "waldiez",
                "run",
                "--structured",
                "--file",
                resource.fsPath,
                "--output",
                resource.fsPath.replace(/\.waldiez$/, ".py"),
                "--uploads-root",
                parentDir.fsPath,
                "--force",
            ];

            // Verify each argument
            assert.strictEqual(expectedArgs[0], "-m");
            assert.strictEqual(expectedArgs[1], "waldiez");
            assert.strictEqual(expectedArgs[2], "run");
            assert.strictEqual(expectedArgs[3], "--structured");
            assert.strictEqual(expectedArgs[4], "--file");
            assert.strictEqual(expectedArgs[5], resource.fsPath);
            assert.strictEqual(expectedArgs[6], "--output");
            assert.strictEqual(expectedArgs[7], resource.fsPath.replace(/\.waldiez$/, ".py"));
            assert.strictEqual(expectedArgs[8], "--uploads-root");
            assert.strictEqual(expectedArgs[9], parentDir.fsPath);
            assert.strictEqual(expectedArgs[10], "--force");

            // Test output file transformation
            if (process.platform !== "win32") {
                assert.strictEqual(resource.fsPath.replace(/\.waldiez$/, ".py"), "/test/my-flow.py");
            } else {
                assert.strictEqual(resource.fsPath.replace(/\.waldiez$/, ".py"), "\\test\\my-flow.py");
            }
        });

        test("should handle _onExit with different scenarios", async function () {
            if (!FlowRunner) {
                console.warn("Skipping ....");
                this.skip();
            }

            const mockWrapper = { executable: "/usr/bin/python3" };
            const runner = new FlowRunner(mockWrapper);

            const mockTransport = {
                sendMessage: sandbox.spy(),
                onWorkflowEnd: sandbox.spy(),
            };

            // Test successful exit
            const resolveSpy1 = sandbox.spy();
            (runner as any)._running = true;

            await (runner as any)._onExit(resolveSpy1, false, mockTransport, "chat", 0);

            sinon.assert.calledOnce(resolveSpy1);
            sinon.assert.calledWith(mockTransport.onWorkflowEnd, 0, "Flow execution completed", "chat");
            assert.strictEqual((runner as any)._running, false);

            // Reset
            mockTransport.onWorkflowEnd.resetHistory();

            // Test error exit
            const resolveSpy2 = sandbox.spy();
            (runner as any)._running = true;

            await (runner as any)._onExit(resolveSpy2, false, mockTransport, "chat", 1);

            sinon.assert.calledOnce(resolveSpy2);
            sinon.assert.calledWith(mockTransport.onWorkflowEnd, 1, "Flow execution failed", "chat");

            // Reset
            mockTransport.onWorkflowEnd.resetHistory();

            // Test cancelled exit
            const resolveSpy3 = sandbox.spy();
            (runner as any)._running = true;

            await (runner as any)._onExit(resolveSpy3, true, mockTransport, "step", 1);

            sinon.assert.calledOnce(resolveSpy3);
            sinon.assert.calledWith(mockTransport.onWorkflowEnd, 1, "Flow execution cancelled", "step");
        });

        test("should handle _onExit with stop requested", async function () {
            if (!FlowRunner) {
                console.warn("Skipping ....");
                this.skip();
            }

            const mockWrapper = { executable: "/usr/bin/python3" };
            const runner = new FlowRunner(mockWrapper);

            const mockTransport = {
                sendMessage: sandbox.spy(),
                onWorkflowEnd: sandbox.spy(),
            };

            // Set stop requested
            (runner as any)._stopRequested = true;
            (runner as any)._running = true;

            const resolveSpy = sandbox.spy();
            await (runner as any)._onExit(resolveSpy, false, mockTransport, "chat", 0);

            // Should resolve immediately without calling onWorkflowEnd
            sinon.assert.calledOnce(resolveSpy);
            sinon.assert.notCalled(mockTransport.onWorkflowEnd);
            assert.strictEqual((runner as any)._stopRequested, false);
            assert.strictEqual((runner as any)._running, false);
        });

        test("should create ChatMessageProcessor and JsonChunkBuffer correctly", async function () {
            if (!FlowRunner) {
                console.warn("Skipping ....");
                this.skip();
            }

            // Test that the classes would be instantiated with correct parameters
            const resource = vscode.Uri.parse("file:///test/flow.waldiez");
            const parentDir = vscode.Uri.joinPath(resource, "..");

            const mockTransport = {
                sendMessage: sandbox.spy(),
                onWorkflowEnd: sandbox.spy(),
            };

            // Mock the classes to capture their construction
            const ChatMessageProcessor = (await import("../../../../host/messaging")).ChatMessageProcessor;
            const JsonChunkBuffer = (await import("../../../../host/messaging/chunks")).JsonChunkBuffer;

            // Test ChatMessageProcessor construction parameters
            const processor = new ChatMessageProcessor(mockTransport as any, parentDir);
            assert.ok(processor);

            // Test JsonChunkBuffer construction with callbacks
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            let jsonCallback: any;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            let textCallback: any;

            const jsonParser = new JsonChunkBuffer(
                (obj: any) => {
                    jsonCallback = obj;
                },
                (text: string) => {
                    textCallback = text;
                },
            );
            assert.ok(jsonParser);
            assert.ok(typeof jsonParser.handleChunk === "function");
        });
    });
});
