import {
    traceError,
    traceInfo,
    traceLog,
    traceVerbose,
    traceWarn
} from '../log/logging';
import { ensureWaldiezPy } from './common';
import { PythonWrapper } from './python';
import { ChildProcess, spawn } from 'child_process';
import * as vscode from 'vscode';

export class FlowConverter extends vscode.Disposable {
    private _wrapper: PythonWrapper;
    private _proc: ChildProcess | undefined;

    constructor(wrapper: PythonWrapper) {
        super(() => this.dispose());
        this._wrapper = wrapper;
    }
    public async convert(resource: vscode.Uri, extension: '.py' | '.ipynb') {
        if (!this._wrapper.executable) {
            throw new Error('Python extension not found');
        }
        if (!resource.fsPath.endsWith('.waldiez')) {
            throw new Error('Invalid file type');
        }
        const outputFile = resource.fsPath.replace('.waldiez', extension);
        try {
            await ensureWaldiezPy(this._wrapper.executable);
        } catch (_e) {
            throw new Error('Failed to install waldiez');
        }
        if (!this._wrapper.executable) {
            throw new Error('Python executable not found');
        }
        const toRun = [
            '-m',
            'waldiez',
            '--force',
            '--export',
            '--output',
            `${outputFile}`,
            `${resource.fsPath}`
        ];
        traceVerbose(`Converting ${resource.fsPath} to ${outputFile}`);
        return new Promise<string>((resolve, reject) => {
            if (!this._wrapper.executable) {
                traceError('Python extension not found');
                reject();
                return;
            }
            const convert = spawn(this._wrapper.executable, toRun);
            this._proc = convert;
            convert.stdout.on('data', data => {
                traceLog(data);
            });
            convert.stderr.on('data', data => {
                // python logging sends logs to stderr
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
            convert.on('exit', code => {
                if (code === 0) {
                    resolve(outputFile);
                } else {
                    reject('Failed to convert flow');
                }
            });
        });
    }
    dispose() {
        if (this._proc) {
            this._proc.kill();
        }
    }
}
