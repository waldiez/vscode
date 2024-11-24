import * as extension from '../../extension';
import * as assert from 'assert';
import { before, suite, test } from 'mocha';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
    let extensionContext: vscode.ExtensionContext;
    suiteSetup(async () => {
        await vscode.extensions
            .getExtension('Waldiez.waldiez-vscode')!
            .activate();
        vscode.window.showInformationMessage('Start all tests.');
        extensionContext = (global as any).testExtensionContext;
    });
    suiteTeardown(() => {
        vscode.window.showInformationMessage('All tests done!');
    });

    let waldiezExtension: vscode.Extension<any> | undefined;
    before(async () => {
        waldiezExtension = vscode.extensions.getExtension(
            'Waldiez.waldiez-vscode'
        );
    });
    test('It should be present', () => {
        assert.ok(waldiezExtension);
    });
    test('it should be activated', async () => {
        await extension.activate(extensionContext);
    });
});
