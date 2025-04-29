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

    outputChannel.appendLine("Initializing Waldiez...");
    showOutput();

    initializeAfterPythonReady(context, outputChannel);
};

async function initializeAfterPythonReady(
    context: ExtensionContext,
    //provider: WaldiezEditorProvider,
    outputChannel: vscode.OutputChannel,
) {
    try {
        const pythonExt = vscode.extensions.getExtension("ms-python.python");
        if (!pythonExt?.isActive) {
            traceError("Error! Python Extension not active!");
            showOutput();
        }
        if (!pythonExt) {
            traceError("Error:: Python extension not found.");
            showOutput();
            return;
        }

        await pythonExt.activate();

        // wait till Python API interpreter is available

        const waitForInterpreterReady = async (timeoutMs = 30000) => {
            const api = pythonExt.exports;
            const start = Date.now();
            while (Date.now() - start < timeoutMs) {
                const details = await api.environments?.getActiveEnvironmentPath?.();
                if (details?.path) {
                    return;
                }
                await new Promise(res => setTimeout(res, 250)); // wait 250ms and try again
            }
        };
        await waitForInterpreterReady();

        // make sure the discovery/refresh cycle is finished
        const api = pythonExt.exports.environments; // kicks off a scan *and* waits for it to finish
        await api.refreshEnvironments();

        // Ensure a valid Python interpreter (>=3.10, <3=.13) is available
        const wrapper = await PythonWrapper.create(waldiezExtensionDisposables);
        if (!wrapper || !wrapper.executable) {
            traceError("Failed to find a valid Python interpreter (>=3.10, <=3.13)");
            showOutput();

            deactivate();
            return; // Abort activation if no valid Python interpreter is found
        }

        if (pythonExt?.isActive) {
            outputChannel.appendLine("Python ready. Starting Waldiez...");
            showOutput();
        }

        // Initialize the FlowRunner, FlowConverter, and custom editor provider
        const flowRunner = new FlowRunner(wrapper);
        waldiezExtensionDisposables.push(flowRunner); // Add the FlowRunner to disposables for cleanup

        const flowConverter = new FlowConverter(wrapper);
        waldiezExtensionDisposables.push(flowConverter); // Add the FlowConverter to disposables for cleanup

        const provider = new WaldiezEditorProvider(context); //, flowRunner, waldiezExtensionDisposables);
        waldiezExtensionDisposables.push(provider); // Add the custom editor provider to disposables
        provider.initialize(flowRunner);

        // Register extension commands
        registerCommands(flowConverter, flowRunner, waldiezExtensionDisposables);
    } catch (err) {
        traceError("Unexpected error during Python setup: " + (err as Error).message);
        showOutput();
    }
}
/**
 * Deactivates the extension and disposes of all registered disposables.
 */
export const deactivate = (): void => {
    waldiezExtensionDisposables.forEach(d => d.dispose()); // Dispose of all resources
};
