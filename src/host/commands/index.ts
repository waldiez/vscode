/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2024 - 2025 Waldiez & contributors
 */
import * as vscode from "vscode";

import { CONVERT_TO_IPYNB, CONVERT_TO_PYTHON } from "../constants";
import { FlowConverter } from "../flow/converter";
import { traceInfo } from "../log/logging";
import { convertFlow } from "./convert";

/**
 * Registers the extension commands.
 *
 * @param converter - The FlowConverter instance for converting flows.
 * @param disposables - Array to store disposable resources for cleanup.
 */
export const registerCommands = async (
    converter: FlowConverter,
    disposables: vscode.Disposable[],
): Promise<void> => {
    // Register command to convert flow to Python
    const toPython = vscode.commands.registerCommand(CONVERT_TO_PYTHON, async (resource: vscode.Uri) => {
        traceInfo("Converting flow to Python");
        return await convertFlow(converter, resource, ".py");
    });

    // Register command to convert flow to Jupyter Notebook
    const toIpynb = vscode.commands.registerCommand(CONVERT_TO_IPYNB, async (resource: vscode.Uri) => {
        traceInfo("Converting flow to Jupyter Notebook");
        return await convertFlow(converter, resource, ".ipynb");
    });

    // Add commands to disposables for cleanup
    disposables.push(toPython);
    disposables.push(toIpynb);
};
