import packageJSON from '../../../package.json';
import * as assert from 'assert';
import { before, suite, test } from 'mocha';
import * as vscode from 'vscode';

const extensionId = `${packageJSON.publisher}.${packageJSON.name}`;

suite('Extension Test Suite', () => {
    before(async () => {
        await vscode.extensions.getExtension(extensionId)?.activate();
    });
    test('It should register all commands', async () => {
        const commands = await vscode.commands.getCommands(true);
        assert.ok(
            commands.includes('waldiez.vscode.toPython'),
            'Command waldiez.vscode.toPython is not registered'
        );
        assert.ok(
            commands.includes('waldiez.vscode.toIpynb'),
            'Command waldiez.vscode.toIpynb is not registered'
        );
        assert.ok(
            commands.includes('waldiez.vscode.run'),
            'Command waldiez.vscode.run is not registered'
        );
    });
    test('Command waldiez.vscode.toPython should be executable', async () => {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        assert.ok(workspaceFolder, 'No workspace folder found');
        const result = await vscode.commands.executeCommand(
            'waldiez.vscode.toPython',
            vscode.Uri.joinPath(workspaceFolder.uri, 'simple.waldiez')
        );
        assert.strictEqual(
            result,
            undefined,
            'Command waldiez.vscode.toPython did not execute correctly'
        );
        await new Promise(resolve => setTimeout(resolve, 5000));
    });
    test('Command waldiez.vscode.toIpynb should be executable', async () => {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        assert.ok(workspaceFolder, 'No workspace folder found');
        const result = await vscode.commands.executeCommand(
            'waldiez.vscode.toIpynb',
            vscode.Uri.joinPath(workspaceFolder.uri, 'simple.waldiez')
        );
        assert.strictEqual(
            result,
            undefined,
            'Command waldiez.vscode.toIpynb did not execute correctly'
        );
        await new Promise(resolve => setTimeout(resolve, 5000));
    });
    test('Command waldiez.vscode.run should be executable', async () => {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        assert.ok(workspaceFolder, 'No workspace folder found');
        const result = await vscode.commands.executeCommand(
            'waldiez.vscode.run',
            vscode.Uri.joinPath(workspaceFolder.uri, 'simple.waldiez')
        );
        assert.strictEqual(
            result,
            undefined,
            'Command waldiez.vscode.run did not execute correctly'
        );
        await new Promise(resolve => setTimeout(resolve, 5000));
    });
});
