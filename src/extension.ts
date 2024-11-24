import {
    FlowConverter,
    FlowRunner,
    PythonWrapper,
    WaldiezEditorProvider
} from './host';
import { registerCommands } from './host/commands';
import { registerLogger, traceError } from './host/log/logging';
import * as vscode from 'vscode';
import { ExtensionContext } from 'vscode';

const disposables: vscode.Disposable[] = [];

export async function activate(context: ExtensionContext): Promise<void> {
    // Set context as a global as some tests depend on it
    (global as any).testExtensionContext = context;
    const outputChannel = vscode.window.createOutputChannel('Waldiez', {
        log: true
    });
    disposables.push(registerLogger(outputChannel));
    // make sure there is a valid python interpreter (>=-3.10, < 3.13) somewhere
    const wrapper = await PythonWrapper.create(disposables);
    if (!wrapper || !wrapper.executable) {
        traceError('Failed to find a valid Python interpreter (>=3.10, <3.13)');
        vscode.window.showErrorMessage(
            'Failed to find a valid Python interpreter (>=3.10, <3.13)'
        );
        return;
    }
    const flowRunner = new FlowRunner(wrapper);
    const flowConverter = new FlowConverter(wrapper);
    disposables.push(flowConverter);
    const provider = new WaldiezEditorProvider(
        context,
        flowRunner,
        disposables
    );
    disposables.push(provider);
    registerCommands(flowConverter, flowRunner, disposables);
}

export function deactivate() {
    disposables.forEach(d => d.dispose());
}
