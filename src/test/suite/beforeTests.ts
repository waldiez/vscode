import { PythonExtension } from '@vscode/python-extension';
import { spawnSync } from 'child_process';
import * as vscode from 'vscode';

export async function beforeTests(): Promise<void> {
    await vscode.extensions.getExtension('ms-python.python')?.activate();
    const api = await PythonExtension.api();
    const maxRetries = 10; // Maximum retries to wait for environments
    let retries = 0;

    while (api.environments.known.length === 0 && retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second
        retries++;
    }

    if (api.environments.known.length === 0) {
        throw new Error('No Python environments were discovered');
    }
    // also pip install waldiez in the environment
    // get the highest version of the environments (that is not 3.13)
    // and install waldiez in that environment
    const highestVersion = api.environments.known
        .filter(env => env.version?.major === 3 && env.version?.minor !== 13)
        .sort((a, b) => {
            if (!a.version?.minor || !b.version?.minor) {
                return 0;
            }
            return b.version.minor - a.version.minor;
        })[0];
    if (highestVersion) {
        const executable = highestVersion.path;
        const isWindows = process.platform === 'win32';
        spawnSync(
            executable,
            ['-m', 'pip', 'install', '--upgrade', 'waldiez'],
            {
                stdio: 'pipe',
                shell: isWindows
            }
        );
    }
    console.log(`Discovered ${api.environments.known.length} environments`);
}
