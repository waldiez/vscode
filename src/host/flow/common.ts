import { traceError, traceInfo, traceLog, traceWarn } from '../log/logging';
import { spawn } from 'child_process';
import * as vscode from 'vscode';

/**
 * Ensures that the `waldiez` Python module is available in the current Python environment.
 *
 * If the module is not found, it attempts to install it using `pip`.
 *
 * @param executable - The path to the Python executable.
 * @returns A Promise that resolves if the `waldiez` module is available or successfully installed,
 *          and rejects if an error occurs during the process.
 */
export const ensureWaldiezPy = (
    executable: string | undefined
): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
        if (!executable) {
            // If no Python executable is provided, log an error and reject the promise
            traceError('Python extension not found');
            reject();
            return;
        }

        // Check if the `waldiez` module is already installed
        const check = spawn(executable, ['-m', 'waldiez', '--version']);
        check.on('exit', code => {
            if (code === 0) {
                // If the module is found, resolve the promise
                resolve();
            } else {
                // If the module is not found, attempt to install it
                vscode.window.showInformationMessage(
                    'Waldiez Python module not found in the current Python environment. Installing...'
                );

                const install = spawn(executable, [
                    '-m',
                    'pip',
                    'install',
                    'waldiez'
                ]);

                // Log standard output during the installation process
                install.stdout.on('data', data => {
                    traceLog(data.toString());
                });

                // Log and categorize standard error during the installation process
                install.stderr.on('data', data => {
                    const dataString = data.toString();
                    if (dataString.startsWith('WARNING')) {
                        traceWarn(dataString);
                        return;
                    }
                    if (dataString.startsWith('ERROR')) {
                        traceError(dataString);
                        return;
                    }
                    if (dataString.startsWith('INFO')) {
                        traceInfo(dataString);
                        return;
                    }
                    traceError(dataString);
                });

                // Handle installation completion
                install.on('exit', code => {
                    if (code === 0) {
                        // Resolve the promise if the installation succeeds
                        resolve();
                    } else {
                        // Reject the promise if the installation fails
                        vscode.window.showErrorMessage(
                            'Failed to install Waldiez Python module. Please check your Python environment.'
                        );
                        reject();
                    }
                });
            }
        });
    });
};
