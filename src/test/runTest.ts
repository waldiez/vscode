import {
    downloadAndUnzipVSCode,
    resolveCliArgsFromVSCodeExecutablePath,
    runTests
} from '@vscode/test-electron';
import { spawnSync } from 'child_process';
import * as path from 'path';

async function main() {
    try {
        const extensionDevelopmentPath = path.resolve(__dirname, '../../');
        const extensionTestsPath = path.resolve(__dirname, './suite/index');
        const vscodeExecutablePath = await downloadAndUnzipVSCode();
        const [cliPath, ...args] =
            resolveCliArgsFromVSCodeExecutablePath(vscodeExecutablePath);
        spawnSync(
            cliPath,
            [...args, '--install-extension', 'ms-python.python'],
            {
                encoding: 'utf-8',
                stdio: 'inherit'
            }
        );
        const launchArgs = [
            '--disable-updates',
            '--disable-crash-reporter',
            '--disable-telemetry',
            '--disable-gpu',
            '--no-sandbox',
            '--sync',
            'off',
            '--log',
            'critical',
            path.resolve(__dirname, '..', '..', 'examples')
        ];
        await runTests({
            vscodeExecutablePath,
            extensionDevelopmentPath,
            extensionTestsPath,
            launchArgs
        });
    } catch (err) {
        console.error(err);
        console.error('Failed to run tests');
        process.exit(1);
    }
}

main();
