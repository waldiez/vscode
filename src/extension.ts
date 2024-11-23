import { WaldiezEditorProvider } from './provider';
import * as vscode from 'vscode';
import { ExtensionContext } from 'vscode';

let disposable: vscode.Disposable | undefined;

export function activate(context: ExtensionContext) {
    // Add command to the extension context
    disposable = WaldiezEditorProvider.register(context);
    context.subscriptions.push(disposable);
}

export function deactivate() {
    disposable?.dispose();
}
