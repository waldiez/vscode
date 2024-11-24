import { FlowConverter, FlowRunner } from './tools';
import * as vscode from 'vscode';

const CONVERT_TO_PYTHON = 'waldiez.vscode.toPython';
const CONVERT_TO_IPYNB = 'waldiez.vscode.toIpynb';
const RUN_FLOW = 'waldiez.vscode.run';

export const registerCommands = async (
    converter: FlowConverter,
    runner: FlowRunner,
    disposables: vscode.Disposable[]
) => {
    const toPython = vscode.commands.registerCommand(
        CONVERT_TO_PYTHON,
        async (resource: vscode.Uri) => {
            await doConvert(converter, resource, '.py');
        }
    );
    const toIpynb = vscode.commands.registerCommand(
        CONVERT_TO_IPYNB,
        async (resource: vscode.Uri) => {
            await doConvert(converter, resource, '.ipynb');
        }
    );
    const runFlow = vscode.commands.registerCommand(
        RUN_FLOW,
        async (resource: vscode.Uri) => {
            await runner.run(resource);
        }
    );
    disposables.push(toPython);
    disposables.push(toIpynb);
    disposables.push(runFlow);
};

const doConvert = async (
    converter: FlowConverter,
    resource: vscode.Uri,
    extension: '.py' | '.ipynb'
) => {
    const to = extension === '.py' ? 'Python' : 'Jupyter Notebook';
    vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: `Converting flow to ${to}`
        },
        async () => {
            // await convertFlow(converter, resource, extension);
            try {
                const outputFile = await converter.convert(resource, extension);
                const selection = vscode.window.showInformationMessage(
                    'Flow converted successfully',
                    'Open'
                );
                selection.then(value => {
                    if (value === 'Open') {
                        vscode.commands.executeCommand(
                            'vscode.open',
                            vscode.Uri.file(outputFile)
                        );
                    }
                });
                vscode.commands.executeCommand(
                    'workbench.files.action.refreshFilesExplorer'
                );
            } catch (_) {
                vscode.window.showErrorMessage('Failed to convert flow');
            }
        }
    );
};
