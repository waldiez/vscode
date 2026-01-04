/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2024 - 2026 Waldiez & contributors
 */
import * as assert from "assert";
import { before, suite, test } from "mocha";
import * as vscode from "vscode";

import packageJSON from "../../../../package.json";

const extensionId = `${packageJSON.publisher}.${packageJSON.name}`;

suite("Extension commands Test Suite", () => {
    before(async () => {
        const ext = vscode.extensions.getExtension(extensionId);
        if (!ext) {
            throw new Error(`Extension ${extensionId} not found`);
        }
        await ext.activate();
        await new Promise(resolve => setTimeout(resolve, 500));
    });
    test("It should register all commands", async () => {
        const commands = await vscode.commands.getCommands(true);
        assert.ok(
            commands.includes("waldiez.vscode.toPython"),
            "Command waldiez.vscode.toPython is not registered",
        );
        assert.ok(
            commands.includes("waldiez.vscode.toIpynb"),
            "Command waldiez.vscode.toIpynb is not registered",
        );
    });
    test("Should convert a .waldiez flow to .py using waldiez.vscode.toPython", async () => {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        assert.ok(workspaceFolder, "No workspace folder found");
        const result = await vscode.commands.executeCommand(
            "waldiez.vscode.toPython",
            vscode.Uri.joinPath(workspaceFolder.uri, "simple.waldiez"),
        );
        assert.strictEqual(result, undefined, "Command waldiez.vscode.toPython did not execute correctly");
        // const pythonFile = vscode.Uri.joinPath(workspaceFolder.uri, "simple.py");
        // assert.ok(await vscode.workspace.fs.stat(pythonFile), "Python file not found");
        // vscode.workspace.fs.delete(pythonFile);
    });
    test("Should convert a .waldiez flow to .ipynb using waldiez.vscode.toIpynb", async () => {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        assert.ok(workspaceFolder, "No workspace folder found");
        const result = await vscode.commands.executeCommand(
            "waldiez.vscode.toIpynb",
            vscode.Uri.joinPath(workspaceFolder.uri, "simple.waldiez"),
        );
        assert.strictEqual(result, undefined, "Command waldiez.vscode.toIpynb did not execute correctly");
        // const ipynbFile = vscode.Uri.joinPath(workspaceFolder.uri, "simple.ipynb");
        // assert.ok(await vscode.workspace.fs.stat(ipynbFile), "Jupyter Notebook file not found");
        // vscode.workspace.fs.delete(ipynbFile);
    });
    test("It should not convert an invalid .waldiez file", async () => {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        assert.ok(workspaceFolder, "No workspace folder found");
        await vscode.commands.executeCommand(
            "waldiez.vscode.toPython",
            vscode.Uri.joinPath(workspaceFolder.uri, "invalid.waldiez"),
        );
        const pythonFile = vscode.Uri.joinPath(workspaceFolder.uri, "invalid.py");
        const pythonFileExists = await vscode.workspace.fs.stat(pythonFile).then(
            () => true,
            () => false,
        );
        assert.strictEqual(
            pythonFileExists,
            false,
            "Should not have created a Python file from invalid .waldiez",
        );
    });
});
