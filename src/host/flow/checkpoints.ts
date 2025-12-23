/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2024 - 2025 Waldiez & contributors
 */
import { ChildProcess, spawn } from "child_process";
import * as vscode from "vscode";

import { traceError, traceInfo, traceVerbose, traceWarn } from "../log/logging";
import { ensureWaldiezPy } from "./common";
import { PythonWrapper } from "./python";

/**
 * Handles checkpoints management of Waldiez flows.
 */
export class CheckpointsManager extends vscode.Disposable {
    private _wrapper: PythonWrapper; // Wrapper for managing the Python environment
    private _proc: ChildProcess | undefined; // Active process

    /**
     * Constructs a FlowCheckpoints instance.
     *
     * @param wrapper - The PythonWrapper instance to manage the Python interpreter.
     */
    constructor(wrapper: PythonWrapper) {
        super(() => this.dispose()); // Ensure resources are cleaned up on disposal
        this._wrapper = wrapper;
    }

    public async getCheckpoints(
        flowName: string,
        token?: vscode.CancellationToken,
    ): Promise<Record<string, any>> {
        if (!this._wrapper.executable) {
            traceError("Python extension not found");
            throw new Error("Python extension not found");
        }

        // Ensure CLI is available
        try {
            await ensureWaldiezPy(this._wrapper.executable);
        } catch {
            traceError("Failed to install waldiez");
            throw new Error("Failed to install waldiez");
        }

        const args = ["-m", "waldiez.storage", "--session", `"${flowName}"`, "--history"];
        traceVerbose(`Calling: ${this._wrapper.executable} ${args.join(" ")}`);

        const stdoutChunks: string[] = [];
        const stderrChunks: string[] = [];
        const timeoutMs = 30_000;

        return await new Promise<Record<string, any>>((resolve, reject) => {
            if (!this._wrapper.executable) {
                traceError("Python extension not found");
                reject(new Error("Python extension not found"));
                return;
            }

            this._proc = spawn(this._wrapper.executable, args, { stdio: ["ignore", "pipe", "pipe"] });

            // Cancellation support
            const cancelSub = token?.onCancellationRequested(() => {
                traceWarn("getCheckpoints cancelled");
                try {
                    this._proc?.kill();
                } catch {
                    /* noop */
                }
            });

            // Safety timeout
            const timer = setTimeout(() => {
                traceWarn(`Timeout after ${timeoutMs} ms`);
                try {
                    this._proc?.kill();
                } catch {
                    /* noop */
                }
            }, timeoutMs);

            this._proc.stdout?.setEncoding("utf8");
            this._proc.stderr?.setEncoding("utf8");

            this._proc.stdout?.on("data", (d: string) => stdoutChunks.push(d));
            this._proc.stderr?.on("data", (d: string) => stderrChunks.push(d));

            this._proc.on("error", err => {
                clearTimeout(timer);
                cancelSub?.dispose?.();
                reject(err);
            });

            this._proc.on("close", (code: number | null) => {
                clearTimeout(timer);
                cancelSub?.dispose?.();

                const stdout = stdoutChunks.join("");
                const stderr = stderrChunks.join("");

                if (stderr.trim()) {
                    traceWarn(stderr.trim());
                }
                traceVerbose(`waldiez.storage exited with code=${code}`);

                if (code !== 0) {
                    reject(new Error(`waldiez.storage failed with code ${code}\n${stderr || "(no stderr)"}`));
                    return;
                }

                try {
                    const parsed = JSON.parse(stdout);
                    traceInfo(`Parsed ${Object.keys(parsed).length} checkpoints`);
                    resolve(parsed);
                } catch (e: any) {
                    traceError(`Failed to parse JSON from waldiez.storage: ${e?.message || e}`);
                    reject(new Error("Invalid JSON from waldiez.storage"));
                }
            });
        });
    }

    /**
     * Cleans up resources, including terminating any active child processes.
     */
    dispose() {
        if (this._proc) {
            this._proc.kill();
        }
    }
}
