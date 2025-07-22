/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2024 - 2025 Waldiez & contributors
 */
import { ChildProcess, spawn } from "child_process";
import * as vscode from "vscode";

import { clearOutput, isOutputVisible, showOutput, traceInfo, traceVerbose } from "../log/logging";
import { MessageProcessor, MessageTransport } from "../messaging";
import { JsonChunkBuffer } from "../messaging/chunks";
import { getCwd } from "../utils";
import { ensureWaldiezPy } from "./common";
import { PythonWrapper } from "./python";

export class FlowRunner extends vscode.Disposable {
    private _proc: ChildProcess | undefined;
    private _running = false;
    private _wrapper: PythonWrapper;
    private _stopRequested = false;

    constructor(wrapper: PythonWrapper) {
        super(() => this.dispose());
        this._wrapper = wrapper;
    }

    public get wrapper() {
        return this._wrapper;
    }

    public get running() {
        return this._running;
    }

    public stop() {
        this._stopRequested = true;
        const wasRunning = this._running;
        this._cleanup();
        if (wasRunning) {
            traceInfo("Flow stopped");
            vscode.window.showInformationMessage("Flow stopped");
        }
    }

    public async run(resource: vscode.Uri, transport: MessageTransport): Promise<void> {
        if (!(await this._canRun())) {
            return;
        }

        this._running = true;
        clearOutput();
        showOutput();
        traceInfo(`Running flow: ${resource.fsPath}`);

        return vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: "Running waldiez flow",
                cancellable: true,
            },
            async (_progress, token) => {
                await this._doRun(resource, token, transport);
            },
        );
    }

    private async _canRun(): Promise<boolean> {
        if (!this.wrapper.executable) {
            vscode.window.showErrorMessage("Python executable not found");
            return false;
        }

        if (this._running) {
            const response = await vscode.window.showInformationMessage("Already running", "Stop");
            if (response === "Stop") {
                this._cleanup();
                return false;
            }
        }

        try {
            await ensureWaldiezPy(this.wrapper.executable);
            return true;
        } catch {
            vscode.window.showErrorMessage("Failed to install waldiez");
            return false;
        }
    }

    private async _doRun(
        resource: vscode.Uri,
        token: vscode.CancellationToken,
        transport: MessageTransport,
    ): Promise<void> {
        return new Promise(resolve => {
            let cancelled = false;
            token.onCancellationRequested(() => {
                cancelled = true;
                this._cleanup();
            });
            const parentDir = vscode.Uri.joinPath(resource, "..");
            const args = [
                "-m",
                "waldiez",
                "run",
                "--structured",
                "--file",
                resource.fsPath,
                "--output",
                resource.fsPath.replace(/\.waldiez$/, ".py"),
                "--uploads-root",
                parentDir.fsPath,
                "--force",
            ];

            const processor = new MessageProcessor(transport, parentDir);

            const jsonParser = new JsonChunkBuffer(
                obj => processor.handleJson(obj),
                text => processor.handleText(text),
            );

            this._proc = spawn(this.wrapper.executable!, args, {
                cwd: getCwd(resource),
                stdio: ["pipe", "pipe", "pipe"],
            });
            this._proc.stdout?.on("data", chunk => jsonParser.handleChunk(chunk));
            this._proc.stderr?.on("data", chunk => jsonParser.handleChunk(chunk));

            this._proc.on("exit", this._onExit.bind(this, resolve, cancelled, processor));
            processor.stdin = this._proc?.stdin;
        });
    }
    /**
     * Handles the exit event of the process.
     * It resolves the promise and shows a message based on the exit code.
     */
    private async _onExit(
        resolve: () => void,
        isCancelled: boolean,
        processor: MessageProcessor,
        code: number,
    ) {
        this._running = false;

        // Handle stop request early return
        if (this._stopRequested) {
            this._stopRequested = false;
            resolve();
            return;
        }

        const message = this._getExitMessage(code, isCancelled);
        processor.transporter.onWorkflowEnd(code, message);
        traceVerbose(`Process exited with code ${code}: ${message}`);

        await this._showExitNotification(code, isCancelled, message);
        resolve();
    }

    private async _showNotification(message: string, type: "error" | "info"): Promise<void> {
        const showMethod =
            type === "error" ? vscode.window.showErrorMessage : vscode.window.showInformationMessage;

        if (!isOutputVisible()) {
            const response = await showMethod(message, "Show Output");
            if (response === "Show Output") {
                showOutput();
            }
        } else {
            showMethod(message);
        }
    }

    /**
     * Gets the appropriate exit message based on code and cancellation status.
     */
    private _getExitMessage(code: number, isCancelled: boolean): string {
        if (code === 0) {
            return "Flow execution completed";
        }
        if (isCancelled) {
            return "Flow execution cancelled";
        }
        return "Flow execution failed";
    }

    /**
     * Shows the appropriate notification based on execution result.
     */
    private async _showExitNotification(code: number, isCancelled: boolean, message: string): Promise<void> {
        const isSuccess = code === 0;
        const shouldShowError = !isSuccess && !isCancelled;

        if (shouldShowError) {
            await this._showNotification(message, "error");
        } else if (isSuccess) {
            await this._showNotification(message, "info");
        } else if (isCancelled) {
            vscode.window.showInformationMessage(message);
        }
    }

    private _cleanup() {
        if (this._proc) {
            this._proc.kill();
        }
        this._running = false;
    }
}
