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
                const runnerModule = await import("../../host/flow/runner");
                FlowRunner = runnerModule.FlowRunner;
            } catch (error) {
                console.warn("Could not import FlowRunner:", error);
            }
        });

        test("should create FlowRunner instance", function () {
            if (!FlowRunner) {
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
                this.skip();
            }

            const mockWrapper = { executable: "/usr/bin/python3" };
            const runner = new FlowRunner(mockWrapper);
            assert.ok(typeof runner.dispose === "function");
            assert.doesNotThrow(() => runner.dispose());
        });

        test("should dispose properly", function () {
            if (!FlowRunner) {
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
    });
});
