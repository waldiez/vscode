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
        console.log(`Installing waldiez using ${executable}`);
        const pythonVersion = spawnSync(executable, ['--version']);
        console.log(pythonVersion.stdout.toString());
        const output = spawnSync(
            executable,
            ['-m', 'pip', 'install', '--upgrade', 'pip'],
            {
                stdio: 'pipe',
                shell: process.platform === 'win32'
            }
        );
        if (output.status !== 0) {
            console.error(output.stderr.toString());
            throw new Error('Failed to upgrade pip');
        } else {
            console.log(output.stdout.toString());
            console.log('Pip upgraded successfully');
        }
        const output2 = spawnSync(
            executable,
            [
                '-m',
                'pip',
                'install',
                '--upgrade',
                '--break-system-packages',
                'waldiez'
            ],
            {
                stdio: 'pipe',
                shell: process.platform === 'win32'
            }
        );
        if (output2.status !== 0) {
            console.error(output2.stderr.toString());
            throw new Error('Failed to install waldiez');
        } else {
            console.log(output2.stdout.toString());
            console.log('Waldiez installed successfully');
        }
    } else {
        throw new Error('No valid Python environments found');
    }
    console.log(`Discovered ${api.environments.known.length} environments`);
}
