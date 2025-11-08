/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2024 - 2025 Waldiez & contributors
 */
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";
import { ExtensionContext } from "vscode";

import { registerCommands } from "./host/commands";
import { NEW_WALDIEZ_FILE } from "./host/constants";
import { CheckpointsManager } from "./host/flow/checkpoints";
import { FlowConverter } from "./host/flow/converter";
import { PythonWrapper } from "./host/flow/python";
import { FlowRunner } from "./host/flow/runner";
import { registerLogger, showOutput, traceError, traceVerbose } from "./host/log/logging";
import { WaldiezEditorProvider } from "./host/provider";

// store disposables for cleanup
const waldiezExtensionDisposables: vscode.Disposable[] = [];

// noinspection JSUnusedGlobalSymbols
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
    outputChannel.appendLine("Initializing Waldiez...");
    waldiezExtensionDisposables.push(registerLogger(outputChannel)); // Register the logger to use the output channel

    const newFileCmd = vscode.commands.registerCommand(NEW_WALDIEZ_FILE, async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        const activeDoc = vscode.window.activeTextEditor?.document;
        const defaultDir =
            activeDoc?.uri?.scheme === "file"
                ? vscode.Uri.file(path.dirname(activeDoc.uri.fsPath))
                : (workspaceFolders?.[0]?.uri ?? vscode.Uri.file(os.homedir()));
        const targetUri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.joinPath(defaultDir, "Untitled.waldiez"),
            filters: {
                "Waldiez Flows": ["waldiez"],
            },
        });
        traceVerbose(`Saving to: ${targetUri}`);

        if (!targetUri) {
            return; // user cancelled
        }
        const defaultContent = JSON.stringify({});
        await vscode.workspace.fs.writeFile(targetUri, Buffer.from(defaultContent, "utf8"));

        await vscode.commands.executeCommand("vscode.openWith", targetUri, WaldiezEditorProvider.viewType, {
            preview: false,
        });
    });
    waldiezExtensionDisposables.push(newFileCmd);
    // noinspection ES6MissingAwait
    initializeAfterPythonReady(context, outputChannel);
};

// eslint-disable-next-line max-statements
async function initializeAfterPythonReady(
    context: ExtensionContext,
    //provider: WaldiezEditorProvider,
    outputChannel: vscode.OutputChannel,
) {
    try {
        const pythonExt = vscode.extensions.getExtension("ms-python.python");
        if (!pythonExt) {
            traceError("Error:: Python extension not found.");
            showOutput();
            return;
        }
        if (!pythonExt?.isActive) {
            traceError("Error! Python Extension not active!");
            showOutput();
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
                // noinspection TypeScriptUMDGlobal
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
        }

        // Initialize the FlowRunner, FlowConverter, and custom editor provider
        const flowRunner = new FlowRunner(wrapper);
        waldiezExtensionDisposables.push(flowRunner);

        const flowConverter = new FlowConverter(wrapper);
        waldiezExtensionDisposables.push(flowConverter);

        const checkpointsManager = new CheckpointsManager(wrapper);
        waldiezExtensionDisposables.push(checkpointsManager);

        // custom editor provider to display and edit flows
        const provider = new WaldiezEditorProvider(context, flowRunner, checkpointsManager);
        waldiezExtensionDisposables.push(provider);
        provider.initialize(flowRunner);

        // Register extension commands
        // noinspection ES6MissingAwait
        registerCommands(flowConverter, waldiezExtensionDisposables);
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
