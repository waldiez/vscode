import { FlowConverter } from '../flow/converter';
import { traceError } from '../log/logging';
import * as vscode from 'vscode';

/**
 * Converts a flow to the specified format and handles progress and errors.
 *
 * @param converter - The FlowConverter instance for conversion.
 * @param resource - The URI of the flow file to convert.
 * @param extension - The target file extension ('.py' or '.ipynb').
 */
export const convertFlow = async (
    converter: FlowConverter,
    resource: vscode.Uri,
    extension: '.py' | '.ipynb'
): Promise<void> => {
    const to = extension === '.py' ? 'Python' : 'Jupyter Notebook';

    // Show progress notification while performing the conversion
    return vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: `Converting flow to ${to}`
        },
        async () => {
            try {
                // Perform the conversion
                const outputFile = await converter.convert(resource, extension);

                // Notify the user of success and offer to open the converted file
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

                // Refresh the file explorer to show the new file
                vscode.commands.executeCommand(
                    'workbench.files.action.refreshFilesExplorer'
                );
            } catch (error) {
                traceError('Failed to convert flow', error);
                // Notify the user of failure
                vscode.window.showErrorMessage('Failed to convert flow');
            }
        }
    );
};
