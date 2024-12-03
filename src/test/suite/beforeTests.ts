import { PythonExtension } from '@vscode/python-extension';
import * as vscode from 'vscode';

export async function beforeTests() {
    await vscode.extensions.getExtension('ms-python.python')?.activate();
    await waitForPythonEnvironments();
    const api = await PythonExtension.api();
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
    if (!highestVersion) {
        throw new Error('No suitable Python environment found');
    }
    console.log(`Using Python environment: ${highestVersion.path}`);
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
};
