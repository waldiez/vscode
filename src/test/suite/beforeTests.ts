import { PythonExtension } from '@vscode/python-extension';
import { spawnSync } from 'child_process';
import * as vscode from 'vscode';

export async function beforeTests() {
    await vscode.extensions.getExtension('ms-python.python')?.activate();
    const environmentsFound = await waitForPythonEnvironments();
    console.log('Discovered environments:');
    console.log(environmentsFound);
    // also pip install waldiez in the environment
    // get the highest version of the environments (that is >= 3.10 and <= 3.13)
    // and install waldiez in that environment
    const highestVersion = environmentsFound
        .filter(
            env =>
                env.version?.major === 3 &&
                (env.version?.minor ?? 9) >= 10 &&
                (env.version?.minor ?? 13) <= 13
        )
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
}

const waitForPythonEnvironments = async () => {
    const api = await PythonExtension.api();
    const maxRetries = 30; // Maximum retries to wait for environments
    let retries = 0;
    while (api.environments.known.length === 0 && retries < maxRetries) {
        console.log(`Attempt ${retries + 1}: Waiting for 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for 2 seconds
        retries++;
        console.log('Discovered environments:');
        console.log(api.environments.known);
    }
    if (api.environments.known.length === 0) {
        throw new Error('No Python environments were discovered');
    }
    return api.environments.known;
};
