/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2024 - 2026 Waldiez & contributors
 */
import { ChildProcess, spawn } from "child_process";
import * as vscode from "vscode";

import { traceError, traceInfo, traceLog, traceVerbose, traceWarn } from "../log/logging";
import { ensureWaldiezPy } from "./common";
import { PythonWrapper } from "./python";

/**
 * Handles conversion of Waldiez flow files to other formats such as `.py` or `.ipynb`.
 */
export class FlowConverter extends vscode.Disposable {
    private _wrapper: PythonWrapper; // Wrapper for managing the Python environment
    private _proc: ChildProcess | undefined; // Active conversion process

    /**
     * Constructs a FlowConverter instance.
     *
     * @param wrapper - The PythonWrapper instance to manage the Python interpreter.
     */
    constructor(wrapper: PythonWrapper) {
        super(() => this.dispose()); // Ensure resources are cleaned up on disposal
        this._wrapper = wrapper;
    }

    /**
     * Converts a `.waldiez` file to the specified format (`.py` or `.ipynb`).
     *
     * @param resource - The URI of the `.waldiez` file to be converted.
     * @param extension - The target file extension (e.g., `.py` or `.ipynb`).
     * @returns A Promise that resolves to the output file path if successful, or rejects with an error.
     * @throws If the Python extension or Waldiez module is unavailable, or if the file type is invalid.
     */
    public async convert(resource: vscode.Uri, extension: ".py" | ".ipynb"): Promise<string> {
        // Ensure the Python interpreter is available
        if (!this._wrapper.executable) {
            traceError("Python extension not found");
            throw new Error("Python extension not found");
        }

        // Validate the file type
        if (!resource.fsPath.endsWith(".waldiez")) {
            traceError("Invalid file type");
            throw new Error("Invalid file type");
        }

        // Determine the output file path
        const outputFile = resource.fsPath.replace(".waldiez", extension);

        try {
            // Ensure the Waldiez Python module is installed
            await ensureWaldiezPy(this._wrapper.executable);
        } catch (_e) {
            traceError("Failed to install waldiez");
            throw new Error("Failed to install waldiez");
        }

        // Recheck if the Python executable is available
        if (!this._wrapper.executable) {
            traceError("Python extension not found");
            throw new Error("Python extension not found");
        }

        // Prepare the arguments for the conversion process
        const toRun = [
            "-m",
            "waldiez",
            "convert",
            "--file",
            `${resource.fsPath}`,
            "--output",
            `${outputFile}`,
            "--force",
        ];
        traceVerbose(`Converting ${resource.fsPath} to ${outputFile}`);

        // Perform the conversion using a child process
        // noinspection TypeScriptUMDGlobal
        return new Promise<string>((resolve, reject) => {
            if (!this._wrapper.executable) {
                traceError("Python extension not found");
                reject("Python extension not found");
                return;
            }

            const convert = spawn(this._wrapper.executable, toRun, {
                cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
            });
            this._proc = convert;

            // Handle stdout logging
            convert.stdout.on("data", data => {
                traceLog(data.toString());
            });

            // Handle stderr logging and categorize messages
            convert.stderr.on("data", data => {
                const dataString = data.toString();

                if (dataString.startsWith("WARNING")) {
                    traceWarn(dataString);
                } else if (dataString.startsWith("ERROR")) {
                    traceError(dataString);
                } else if (dataString.startsWith("INFO")) {
                    traceInfo(dataString);
                } else {
                    traceError(dataString);
                }
            });

            // Handle process completion
            convert.on("exit", code => {
                if (code === 0) {
                    resolve(outputFile); // Resolve with the output file path
                } else {
                    reject("Failed to convert flow"); // Reject with an error message
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
