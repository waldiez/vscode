import { traceError, traceInfo } from '../log/logging';
import { PythonWrapper } from './python';
import { ChildProcess } from 'child_process';
import * as vscode from 'vscode';

export class FlowRunner extends vscode.Disposable {
    private _wrapper: PythonWrapper;
    private _proc: ChildProcess | undefined;

    constructor(wrapper: PythonWrapper) {
        super(() => this.dispose());
        this._wrapper = wrapper;
    }

    public get wrapper() {
        return this._wrapper;
    }

    dispose() {
        if (this._proc) {
            this._proc.kill();
        }
    }

    public async run(resource: vscode.Uri) {
        if (!this._wrapper.executable) {
            traceError('Python executable not found');
            vscode.window.showErrorMessage('Python executable not found');
            return;
        }
        traceInfo('Running flow:', resource.fsPath);
    }
}
