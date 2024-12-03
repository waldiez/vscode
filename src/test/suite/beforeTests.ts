import { PythonExtension } from '@vscode/python-extension';
import { spawnSync } from 'child_process';
import * as vscode from 'vscode';

export async function beforeTests() {
    await vscode.extensions.getExtension('ms-python.python')?.activate();
    await waitForPythonEnvironments();
    const api = await PythonExtension.api();
    // also pip install waldiez in the environment
    // get the highest version of the environments (that is >= 3.10 and <= 3.13)
    // and install waldiez in that environment
    const highestVersion = api.environments.known
        .filter(
            env =>
                env.version?.major === 3 &&
                (env.version?.minor ?? 9) >= 10 &&
                (env.version?.minor ?? 13) < 13
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
    }
}

const waitForPythonEnvironments = async () => {
    const pythonApi: PythonExtension = await PythonExtension.api();
    const environments = pythonApi.environments;
    const maxRetries = 30; // Maximum retries to wait for environments
    let retries = 0;
    while (environments.known.length === 0 && retries < maxRetries) {
        console.log(`Attempt ${retries + 1}: Waiting for 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for 2 seconds
        retries++;
        await environments.refreshEnvironments();
    }
    return environments.known;
};
