/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2024 - 2025 Waldiez & contributors
 */
/* eslint-disable @typescript-eslint/no-require-imports */
import * as assert from "assert";
import { afterEach, before, beforeEach, suite, test } from "mocha";
import path from "path";
import * as sinon from "sinon";
import * as vscode from "vscode";

import packageJSON from "../../../package.json";

const extensionId = `${packageJSON.publisher}.${packageJSON.name}`;

suite("FlowConverter Tests", () => {
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

    suite("FlowConverter", () => {
        let FlowConverter: any;

        before(async () => {
            try {
                const module = await import("../../host/flow/converter");
                FlowConverter = module.FlowConverter;
            } catch (error) {
                console.warn("Could not import FlowConverter:", error);
            }
        });

        test("should create converter instance", function () {
            if (!FlowConverter) {
                this.skip();
            }

            const mockWrapper = { executable: "/usr/bin/python3" };
            const converter = new FlowConverter(mockWrapper);

            assert.ok(converter);
        });

        test("should fail conversion with invalid file type", async function () {
            if (!FlowConverter) {
                this.skip();
            }

            const mockWrapper = { executable: "/usr/bin/python3" };
            const converter = new FlowConverter(mockWrapper);
            const testUri = vscode.Uri.parse("file:///test/flow.txt");

            try {
                await converter.convert(testUri, ".py");
                assert.fail("Should have thrown error");
            } catch (error) {
                assert.strictEqual((error as Error).message, "Invalid file type");
            }
        });

        test("should fail conversion without python executable", async function () {
            if (!FlowConverter) {
                this.skip();
            }

            const mockWrapper = { executable: undefined };
            const converter = new FlowConverter(mockWrapper);
            const testUri = vscode.Uri.parse("file:///test/flow.waldiez");

            try {
                await converter.convert(testUri, ".py");
                assert.fail("Should have thrown error");
            } catch (error) {
                assert.strictEqual((error as Error).message, "Python extension not found");
            }
        });

        test("should fail conversion if waldiez install fails", async function () {
            if (!FlowConverter) {
                this.skip();
            }

            const mockWrapper = { executable: "/usr/bin/python3" };
            const converter = new FlowConverter(mockWrapper);

            // Mock ensureWaldiezPy to reject
            const flowCommonModule = await import("../../host/flow/common");
            const ensureWaldiezPyStub = sandbox.stub(flowCommonModule, "ensureWaldiezPy").rejects();

            const testUri = vscode.Uri.parse("file:///test/flow.waldiez");

            try {
                await converter.convert(testUri, ".py");
                assert.fail("Should have thrown error");
            } catch (error) {
                assert.strictEqual((error as Error).message, "Failed to install waldiez");
            }

            ensureWaldiezPyStub.restore();
        });

        test("should convert waldiez file to python", async function () {
            // noinspection DuplicatedCode
            if (!FlowConverter) {
                this.skip();
            }

            const mockWrapper = { executable: "/usr/bin/python3" };
            const converter = new FlowConverter(mockWrapper);

            // Mock ensureWaldiezPy to resolve
            const flowCommonModule = await import("../../host/flow/common");
            const ensureWaldiezPyStub = sandbox.stub(flowCommonModule, "ensureWaldiezPy").resolves();

            // Mock spawn to return a fake process
            const mockProcess = {
                stdout: { on: sandbox.spy() },
                stderr: { on: sandbox.spy() },
                on: sandbox.spy(),
            };
            const spawnStub = sandbox.stub(require("child_process"), "spawn").returns(mockProcess);

            const testUri = vscode.Uri.parse("file:///test/flow.waldiez");
            const convertPromise = converter.convert(testUri, ".py");

            // Simulate successful conversion
            setImmediate(() => {
                const exitCallback = mockProcess.on.getCalls().find(call => call.args[0] === "exit");
                if (exitCallback) {
                    exitCallback.args[1](0); // Exit with success code
                }
            });

            const result = await convertPromise;

            // assert.strictEqual(result, "/test/flow.py");
            assert.strictEqual(path.basename(result), "flow.py");
            assert.ok(result.includes("test"));
            assert.ok(result.endsWith(".py"));
            assert.ok(!result.endsWith(".waldiez"));

            ensureWaldiezPyStub.restore();
            spawnStub.restore();
        });

        test("should convert waldiez file to jupyter notebook", async function () {
            // noinspection DuplicatedCode
            if (!FlowConverter) {
                this.skip();
            }

            const mockWrapper = { executable: "/usr/bin/python3" };
            const converter = new FlowConverter(mockWrapper);

            const flowCommonModule = await import("../../host/flow/common");
            const ensureWaldiezPyStub = sandbox.stub(flowCommonModule, "ensureWaldiezPy").resolves();

            const mockProcess = {
                stdout: { on: sandbox.spy() },
                stderr: { on: sandbox.spy() },
                on: sandbox.spy(),
            };
            const spawnStub = sandbox.stub(require("child_process"), "spawn").returns(mockProcess);

            const testUri = vscode.Uri.parse("file:///test/flow.waldiez");
            const convertPromise = converter.convert(testUri, ".ipynb");

            setImmediate(() => {
                const exitCallback = mockProcess.on.getCalls().find(call => call.args[0] === "exit");
                if (exitCallback) {
                    exitCallback.args[1](0);
                }
            });

            const result = await convertPromise;
            // assert.strictEqual(result, "/test/flow.ipynb");
            assert.strictEqual(path.basename(result), "flow.ipynb");
            assert.ok(result.includes("test"));
            assert.ok(result.endsWith(".ipynb"));
            assert.ok(!result.endsWith(".waldiez"));

            ensureWaldiezPyStub.restore();
            spawnStub.restore();
        });

        test("should fail conversion on process error", async function () {
            // noinspection DuplicatedCode
            if (!FlowConverter) {
                this.skip();
            }

            const mockWrapper = { executable: "/usr/bin/python3" };
            const converter = new FlowConverter(mockWrapper);

            const flowCommonModule = await import("../../host/flow/common");
            const ensureWaldiezPyStub = sandbox.stub(flowCommonModule, "ensureWaldiezPy").resolves();

            const mockProcess = {
                stdout: { on: sandbox.spy() },
                stderr: { on: sandbox.spy() },
                on: sandbox.spy(),
            };
            const spawnStub = sandbox.stub(require("child_process"), "spawn").returns(mockProcess);

            const testUri = vscode.Uri.parse("file:///test/flow.waldiez");
            const convertPromise = converter.convert(testUri, ".py");

            setImmediate(() => {
                const exitCallback = mockProcess.on.getCalls().find(call => call.args[0] === "exit");
                if (exitCallback) {
                    exitCallback.args[1](1); // Exit with error code
                }
            });

            try {
                await convertPromise;
                assert.fail("Should have thrown error");
            } catch (error) {
                assert.strictEqual(error, "Failed to convert flow");
            }

            ensureWaldiezPyStub.restore();
            spawnStub.restore();
        });

        test("should handle stdout data", async function () {
            // noinspection DuplicatedCode
            if (!FlowConverter) {
                this.skip();
            }

            const mockWrapper = { executable: "/usr/bin/python3" };
            const converter = new FlowConverter(mockWrapper);

            const flowCommonModule = await import("../../host/flow/common");
            const ensureWaldiezPyStub = sandbox.stub(flowCommonModule, "ensureWaldiezPy").resolves();

            const mockProcess = {
                stdout: { on: sandbox.spy() },
                stderr: { on: sandbox.spy() },
                on: sandbox.spy(),
            };
            const spawnStub = sandbox.stub(require("child_process"), "spawn").returns(mockProcess);

            const testUri = vscode.Uri.parse("file:///test/flow.waldiez");
            const convertPromise = converter.convert(testUri, ".py");

            setImmediate(() => {
                // Simulate stdout data
                const stdoutCallback = mockProcess.stdout.on.getCalls().find(call => call.args[0] === "data");
                if (stdoutCallback) {
                    stdoutCallback.args[1]("Converting file...");
                }

                const exitCallback = mockProcess.on.getCalls().find(call => call.args[0] === "exit");
                if (exitCallback) {
                    exitCallback.args[1](0);
                }
            });

            await convertPromise;

            ensureWaldiezPyStub.restore();
            spawnStub.restore();
        });

        test("should handle stderr data with different log levels", async function () {
            // noinspection DuplicatedCode
            if (!FlowConverter) {
                this.skip();
            }

            const mockWrapper = { executable: "/usr/bin/python3" };
            const converter = new FlowConverter(mockWrapper);

            const flowCommonModule = await import("../../host/flow/common");
            const ensureWaldiezPyStub = sandbox.stub(flowCommonModule, "ensureWaldiezPy").resolves();

            const mockProcess = {
                stdout: { on: sandbox.spy() },
                stderr: { on: sandbox.spy() },
                on: sandbox.spy(),
            };
            const spawnStub = sandbox.stub(require("child_process"), "spawn").returns(mockProcess);

            const testUri = vscode.Uri.parse("file:///test/flow.waldiez");
            const convertPromise = converter.convert(testUri, ".py");

            setImmediate(() => {
                // Simulate stderr data with different levels
                const stderrCallback = mockProcess.stderr.on.getCalls().find(call => call.args[0] === "data");
                if (stderrCallback) {
                    stderrCallback.args[1]("WARNING: This is a warning");
                    stderrCallback.args[1]("ERROR: This is an error");
                    stderrCallback.args[1]("INFO: This is info");
                    stderrCallback.args[1]("Unknown log level");
                }

                const exitCallback = mockProcess.on.getCalls().find(call => call.args[0] === "exit");
                if (exitCallback) {
                    exitCallback.args[1](0);
                }
            });

            await convertPromise;

            ensureWaldiezPyStub.restore();
            spawnStub.restore();
        });

        test("should dispose properly", function () {
            if (!FlowConverter) {
                this.skip();
            }

            const mockWrapper = { executable: "/usr/bin/python3" };
            const converter = new FlowConverter(mockWrapper);

            const mockProcess = { kill: sandbox.spy() };
            (converter as any)._proc = mockProcess;

            converter.dispose();

            sinon.assert.calledOnce(mockProcess.kill);
        });
    });
});
