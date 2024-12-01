import { FlowConverter } from '../flow/converter';
import { FlowRunner } from '../flow/runner';
import { traceInfo } from '../log/logging';
import { convertFlow } from './convert';
import { runFlow } from './run';
import * as vscode from 'vscode';

// Command IDs to register
export const CONVERT_TO_PYTHON = 'waldiez.vscode.toPython';
export const CONVERT_TO_IPYNB = 'waldiez.vscode.toIpynb';
export const RUN_FLOW = 'waldiez.vscode.run';

/**
 * Registers the extension commands.
 *
 * @param converter - The FlowConverter instance for converting flows.
 * @param runner - The FlowRunner instance for running flows.
 * @param disposables - Array to store disposable resources for cleanup.
 */
export const registerCommands = async (
    converter: FlowConverter,
    runner: FlowRunner,
    disposables: vscode.Disposable[]
): Promise<void> => {
    // Register command to convert flow to Python
    const toPython = vscode.commands.registerCommand(
        CONVERT_TO_PYTHON,
        async (resource: vscode.Uri) => {
            traceInfo('Converting flow to Python');
            await convertFlow(converter, resource, '.py');
        }
    );

    // Register command to convert flow to Jupyter Notebook
    const toIpynb = vscode.commands.registerCommand(
        CONVERT_TO_IPYNB,
        async (resource: vscode.Uri) => {
            traceInfo('Converting flow to Jupyter Notebook');
            await convertFlow(converter, resource, '.ipynb');
        }
    );

    // Register command to run a flow
    const runWaldiezFlow = vscode.commands.registerCommand(
        RUN_FLOW,
        async (resource: vscode.Uri) => {
            await runFlow(resource, runner);
        }
    );

    // Add commands to disposables for cleanup
    disposables.push(toPython);
    disposables.push(toIpynb);
    disposables.push(runWaldiezFlow);
};
