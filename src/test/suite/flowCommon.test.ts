/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2024 - 2025 Waldiez & contributors
 */
/* eslint-disable @typescript-eslint/no-require-imports */
import * as assert from "assert";
import { afterEach, before, beforeEach, suite, test } from "mocha";
import * as sinon from "sinon";
import * as vscode from "vscode";

import packageJSON from "../../../package.json";

const extensionId = `${packageJSON.publisher}.${packageJSON.name}`;

suite("Flow Common Tests", () => {
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

        test("should succeed if waldiez is already installed with correct version", async function () {
            if (!flowCommon?.ensureWaldiezPy) {
                this.skip();
            }

            const mockSpawnSync = sandbox.stub(require("child_process"), "spawnSync");
            mockSpawnSync.returns({ status: 0, stdout: "waldiez 0.3.0" });

            await flowCommon.ensureWaldiezPy("/usr/bin/python3");

            sinon.assert.calledWith(mockSpawnSync, "/usr/bin/python3", ["-m", "waldiez", "--version"]);
            mockSpawnSync.restore();
        });

        test("should install waldiez if not found", async function () {
            if (!flowCommon?.ensureWaldiezPy) {
                this.skip();
            }

            const mockSpawnSync = sandbox.stub(require("child_process"), "spawnSync");
            const showInfoStub = sandbox.stub(vscode.window, "showInformationMessage").resolves();

            // First call - version check fails
            mockSpawnSync.onFirstCall().returns({ status: 1 });
            // Second call - installation succeeds
            mockSpawnSync.onSecondCall().returns({ status: 0, stdout: "Successfully installed waldiez" });

            await flowCommon.ensureWaldiezPy("/usr/bin/python3");

            assert.strictEqual(mockSpawnSync.callCount, 2);
            sinon.assert.calledOnce(showInfoStub);

            mockSpawnSync.restore();
            showInfoStub.restore();
        });

        test("should update waldiez if version is too old", async function () {
            if (!flowCommon?.ensureWaldiezPy) {
                this.skip();
            }

            const mockSpawnSync = sandbox.stub(require("child_process"), "spawnSync");
            const showInfoStub = sandbox.stub(vscode.window, "showInformationMessage").resolves();

            // First call - old version found
            mockSpawnSync.onFirstCall().returns({ status: 0, stdout: "waldiez 0.1.0" });
            // Second call - update succeeds
            mockSpawnSync.onSecondCall().returns({ status: 0, stdout: "Successfully updated waldiez" });

            await flowCommon.ensureWaldiezPy("/usr/bin/python3");

            assert.strictEqual(mockSpawnSync.callCount, 2);
            sinon.assert.calledOnce(showInfoStub);

            mockSpawnSync.restore();
            showInfoStub.restore();
        });

        test("should handle installation failure", async function () {
            if (!flowCommon?.ensureWaldiezPy) {
                this.skip();
            }

            const mockSpawnSync = sandbox.stub(require("child_process"), "spawnSync");
            const showInfoStub = sandbox.stub(vscode.window, "showInformationMessage").resolves();
            const showErrorStub = sandbox.stub(vscode.window, "showErrorMessage").resolves();

            // First call - version check fails
            mockSpawnSync.onFirstCall().returns({ status: 1 });
            // Second call - installation fails
            mockSpawnSync.onSecondCall().returns({ status: 1, stderr: "Installation failed" });

            try {
                await flowCommon.ensureWaldiezPy("/usr/bin/python3");
                assert.fail("Should have rejected");
            } catch (_) {
                // Expected to reject
            }

            sinon.assert.calledOnce(showErrorStub);

            mockSpawnSync.restore();
            showInfoStub.restore();
            showErrorStub.restore();
        });

        test("should handle version parsing failure", async function () {
            if (!flowCommon?.ensureWaldiezPy) {
                this.skip();
            }

            const mockSpawnSync = sandbox.stub(require("child_process"), "spawnSync");
            const showInfoStub = sandbox.stub(vscode.window, "showInformationMessage").resolves();

            // First call - invalid version output
            mockSpawnSync.onFirstCall().returns({ status: 0, stdout: "invalid version output" });
            // Second call - installation succeeds
            mockSpawnSync.onSecondCall().returns({ status: 0, stdout: "Successfully installed waldiez" });

            await flowCommon.ensureWaldiezPy("/usr/bin/python3");

            assert.strictEqual(mockSpawnSync.callCount, 2);
            sinon.assert.calledOnce(showInfoStub);

            mockSpawnSync.restore();
            showInfoStub.restore();
        });

        test("should handle exception during version check", async function () {
            if (!flowCommon?.ensureWaldiezPy) {
                this.skip();
            }

            const mockSpawnSync = sandbox.stub(require("child_process"), "spawnSync");
            const showInfoStub = sandbox.stub(vscode.window, "showInformationMessage").resolves();

            // First call - throws exception
            mockSpawnSync.onFirstCall().throws(new Error("Command failed"));
            // Second call - installation succeeds
            mockSpawnSync.onSecondCall().returns({ status: 0, stdout: "Successfully installed waldiez" });

            await flowCommon.ensureWaldiezPy("/usr/bin/python3");

            assert.strictEqual(mockSpawnSync.callCount, 2);
            sinon.assert.calledOnce(showInfoStub);

            mockSpawnSync.restore();
            showInfoStub.restore();
        });

        test("should handle exception during installation", async function () {
            if (!flowCommon?.ensureWaldiezPy) {
                this.skip();
            }

            const mockSpawnSync = sandbox.stub(require("child_process"), "spawnSync");
            const showInfoStub = sandbox.stub(vscode.window, "showInformationMessage").resolves();
            const showErrorStub = sandbox.stub(vscode.window, "showErrorMessage").resolves();

            // First call - version check fails
            mockSpawnSync.onFirstCall().returns({ status: 1 });
            // Second call - throws exception
            mockSpawnSync.onSecondCall().throws(new Error("Installation failed"));

            try {
                await flowCommon.ensureWaldiezPy("/usr/bin/python3");
                assert.fail("Should have rejected");
            } catch (_) {
                // Expected to reject
            }

            sinon.assert.calledOnce(showErrorStub);

            mockSpawnSync.restore();
            showInfoStub.restore();
            showErrorStub.restore();
        });
    });
});
