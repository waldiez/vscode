import {
    clearOutput,
    isOutputVisible,
    showOutput,
    traceError,
    traceInfo,
    traceVerbose
} from '../log/logging';
import { ensureWaldiezPy } from './common';
import { PythonWrapper } from './python';
import { ChildProcess, spawn } from 'child_process';
import * as vscode from 'vscode';

// when we get the message below, we should ask for input
const INPUT_INDICATOR =
    "Press enter to skip and use auto-reply, or type 'exit' to end the conversation:";

// the message below means we finished installing the requirements
// and started the flow. It is used to filter previous messages regarding requirements
const AFTER_REQUIREMENTS_INDICATOR =
    'NOTE: If new packages were added and you are using Jupyter, you might need to restart the kernel.';

// the maximum time to wait for user input
export const TIME_TO_WAIT_FOR_INPUT = 60000; // at most 1 minute

export class FlowRunner extends vscode.Disposable {
    private _wrapper: PythonWrapper;
    private _proc: ChildProcess | undefined;
    private _running = false;
    private _messages: string[] = [];

    constructor(wrapper: PythonWrapper) {
        super(() => this.dispose());
        this._wrapper = wrapper;
    }

    public dispose() {
        this._cleanup();
    }

    public get wrapper() {
        return this._wrapper;
    }

    public async run(
        resource: vscode.Uri,
        onInputRequest: (
            previousMessages: string[],
            prompt: string
        ) => Promise<string | undefined>
    ) {
        if (!(await this._canRun())) {
            vscode.window.showErrorMessage(
                'Failed to run flow. Waldiez python module not found'
            );
            return new Promise<void>((_resolve, reject) => {
                reject();
            });
        }
        this._cleanup();
        this._running = true;
        clearOutput();
        showOutput();
        return vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'Running waldiez flow',
                cancellable: true
            },
            async (_progress, token) => {
                await this._doRun(resource, token, onInputRequest);
            }
        );
    }

    private async _canRun() {
        if (!this._wrapper.executable) {
            traceError('Python executable not found');
            vscode.window.showErrorMessage('Python executable not found');
            return false;
        }
        if (this._running) {
            const response = await vscode.window.showInformationMessage(
                'Already running',
                'Stop'
            );
            if (response === 'Stop') {
                this._cleanup();
                return false;
            }
        }
        try {
            // Ensure the Waldiez Python module is installed
            await ensureWaldiezPy(this._wrapper.executable);
            return true;
        } catch (_e) {
            traceError('Failed to install waldiez');
            this._cleanup();
            vscode.window.showErrorMessage('Failed to install waldiez');
            return false;
        }
    }

    private async _doRun(
        resource: vscode.Uri,
        token: vscode.CancellationToken,
        onInputRequest: (
            previousMessages: string[],
            prompt: string
        ) => Promise<string | undefined>
    ) {
        return new Promise<void>(resolve => {
            let isCancelled = false;
            token.onCancellationRequested(() => {
                isCancelled = true;
                this._cleanup();
            });
            traceInfo('Running flow:', resource.fsPath);
            const outputPy = resource.fsPath.replace(/\.waldiez$/, '.py');
            const cmdArgs = [
                '-m',
                'waldiez',
                'run',
                '--file',
                `${resource.fsPath}`,
                '--output',
                `${outputPy}`,
                '--force'
            ];
            this._proc = spawn(this._wrapper.executable!, cmdArgs, {
                cwd: getCwd(resource),
                stdio: ['pipe', 'pipe', 'pipe']
            });
            this._proc.stdout?.on('data', data => {
                this._handleMessage(data.toString(), onInputRequest);
            });
            this._proc.stderr?.on('data', data => {
                this._handleMessage(data.toString(), onInputRequest);
            });
            this._proc.on(
                'exit',
                this._onExit.bind(this, resolve, isCancelled)
            );
        });
    }
    private async _onExit(
        resolve: () => void,
        isCancelled: boolean,
        code: number
    ) {
        this._running = false;
        if (code !== 0) {
            if (!isCancelled) {
                if (!isOutputVisible()) {
                    const response = await vscode.window.showErrorMessage(
                        'Flow execution failed',
                        'Show Output'
                    );
                    if (response === 'Show Output') {
                        showOutput();
                    }
                } else {
                    vscode.window.showErrorMessage('Flow execution failed');
                }
            } else {
                traceInfo('Flow execution cancelled');
                vscode.window.showInformationMessage(
                    'Flow execution cancelled'
                );
            }
        } else {
            if (!isOutputVisible()) {
                const response = await vscode.window.showInformationMessage(
                    'Flow execution completed',
                    'Show Output'
                );
                if (response === 'Show Output') {
                    showOutput();
                }
            } else {
                vscode.window.showInformationMessage(
                    'Flow execution completed'
                );
            }
        }
        resolve();
    }
    private _handleMessage(
        data: string,
        onInputRequest: (
            previousMessages: string[],
            prompt: string
        ) => Promise<string | undefined>
    ) {
        traceInfo(data);
        const lines = data.split('\n');
        for (const line of lines) {
            if (flowNeedsInput(line)) {
                traceVerbose('Input prompt:', line);
                const prompt =
                    line !== '>'
                        ? line
                        : 'Enter your message to start the conversation';
                this._messages.push(prompt);
                onInputRequest(this._messages, prompt)
                    .then(response => {
                        let toSend = response ?? '';
                        if (!toSend.endsWith('\n')) {
                            toSend += '\n';
                        }
                        this._proc?.stdin?.write(toSend);
                    })
                    .catch(err => {
                        traceError('Error handling input request:', err);
                        this._proc?.stdin?.write('\n');
                    });
            } else {
                if (line.trimEnd().endsWith(AFTER_REQUIREMENTS_INDICATOR)) {
                    this._messages = [];
                } else {
                    this._messages.push(line);
                }
            }
        }
    }

    private _cleanup() {
        if (this._proc) {
            this._proc.kill();
        }
        this._running = false;
        this._messages = [];
    }
}

const flowNeedsInput = (line: string) => {
    const trimmed = line.trim();
    if (line === '>') {
        return true;
    }
    return trimmed.endsWith(INPUT_INDICATOR);
};

const getCwd = (resource: vscode.Uri) => {
    // either the dir of the resource or the workspace root
    let cwd = vscode.workspace.getWorkspaceFolder(resource)?.uri.fsPath;
    if (!cwd) {
        cwd = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    }
    if (!cwd) {
        cwd = vscode.Uri.joinPath(resource, '..').fsPath;
    }
    return cwd;
};
