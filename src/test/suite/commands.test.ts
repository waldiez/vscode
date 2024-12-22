import packageJSON from "../../../package.json";
import * as assert from "assert";
import { before, suite, test } from "mocha";
import * as vscode from "vscode";

const extensionId = `${packageJSON.publisher}.${packageJSON.name}`;

suite("Extension Test Suite", () => {
    before(async () => {
        await vscode.extensions.getExtension(extensionId)?.activate();
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
        assert.ok(commands.includes("waldiez.vscode.run"), "Command waldiez.vscode.run is not registered");
    });
    test("Command waldiez.vscode.toPython should be executable", async () => {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        assert.ok(workspaceFolder, "No workspace folder found");
        const result = await vscode.commands.executeCommand(
            "waldiez.vscode.toPython",
            vscode.Uri.joinPath(workspaceFolder.uri, "simple.waldiez"),
        );
        assert.strictEqual(result, undefined, "Command waldiez.vscode.toPython did not execute correctly");
        const pythonFile = vscode.Uri.joinPath(workspaceFolder.uri, "simple.py");
        assert.ok(await vscode.workspace.fs.stat(pythonFile), "Python file not found");
        vscode.workspace.fs.delete(pythonFile);
    });
    test("Command waldiez.vscode.toIpynb should be executable", async () => {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        assert.ok(workspaceFolder, "No workspace folder found");
        const result = await vscode.commands.executeCommand(
            "waldiez.vscode.toIpynb",
            vscode.Uri.joinPath(workspaceFolder.uri, "simple.waldiez"),
        );
        assert.strictEqual(result, undefined, "Command waldiez.vscode.toIpynb did not execute correctly");
        const ipynbFile = vscode.Uri.joinPath(workspaceFolder.uri, "simple.ipynb");
        assert.ok(await vscode.workspace.fs.stat(ipynbFile), "Jupyter Notebook file not found");
        vscode.workspace.fs.delete(ipynbFile);
    });
    test("Command waldiez.vscode.run should be executable", async () => {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        assert.ok(workspaceFolder, "No workspace folder found");
        const result = await vscode.commands.executeCommand(
            "waldiez.vscode.run",
            vscode.Uri.joinPath(workspaceFolder.uri, "simple.waldiez"),
        );
        assert.strictEqual(result, undefined, "Command waldiez.vscode.run did not execute correctly");
        const output_folder = vscode.Uri.joinPath(workspaceFolder.uri, "waldiez_out");
        assert.ok(await vscode.workspace.fs.stat(output_folder), "Output folder not found");
        vscode.workspace.fs.delete(output_folder, { recursive: true });
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
        assert.strictEqual(pythonFileExists, false, "Python file found");
    });
});
