import { registerCommands } from "./host/commands";
import { FlowConverter } from "./host/flow/converter";
import { PythonWrapper } from "./host/flow/python";
import { FlowRunner } from "./host/flow/runner";
import { registerLogger, showOutput, traceError } from "./host/log/logging";
import { WaldiezEditorProvider } from "./host/provider";
import * as vscode from "vscode";
import { ExtensionContext } from "vscode";

// store disposables for cleanup
const waldiezExtensionDisposables: vscode.Disposable[] = [];

/**
 * Activates the extension and initializes required components.
 *
 * @param context - The extension context provided by VS Code.
 * @returns A Promise that resolves once the activation process is complete.
 */
export const activate = async (context: ExtensionContext): Promise<void> => {
    // Create and clear an output channel for the extension
    const outputChannel = vscode.window.createOutputChannel("Waldiez", {
        log: true,
    });
    outputChannel.clear();
    waldiezExtensionDisposables.push(registerLogger(outputChannel)); // Register the logger to use the output channel

    // Ensure a valid Python interpreter (>=3.10, <3.13) is available
    const wrapper = await PythonWrapper.create(waldiezExtensionDisposables);
    if (!wrapper || !wrapper.executable) {
        traceError("Failed to find a valid Python interpreter (>=3.10, <3.13)");
        showOutput();
        vscode.window.showErrorMessage("Failed to find a valid Python interpreter (>=3.10, <3.13)");
        deactivate();
        return; // Abort activation if no valid Python interpreter is found
    }

    // Initialize the FlowRunner, FlowConverter, and custom editor provider
    const flowRunner = new FlowRunner(wrapper);
    waldiezExtensionDisposables.push(flowRunner); // Add the FlowRunner to disposables for cleanup

    const flowConverter = new FlowConverter(wrapper);
    waldiezExtensionDisposables.push(flowConverter); // Add the FlowConverter to disposables for cleanup

    const provider = new WaldiezEditorProvider(context, flowRunner, waldiezExtensionDisposables);
    waldiezExtensionDisposables.push(provider); // Add the custom editor provider to disposables

    // Register extension commands
    registerCommands(flowConverter, flowRunner, waldiezExtensionDisposables);
};

/**
 * Deactivates the extension and disposes of all registered disposables.
 */
export const deactivate = (): void => {
    waldiezExtensionDisposables.forEach(d => d.dispose()); // Dispose of all resources
};
