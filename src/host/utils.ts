/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2024 - 2026 Waldiez & contributors
 */
import { Uri, Webview, window, workspace } from "vscode";

import { showOutput } from "./log/logging";

/**
 * Utility functions for Waldiez VS Code extension
 */

/** Get a unique nonce
 * This nonce is used for security purposes, such as Content Security Policy (CSP) in webviews.
 * @returns A random string of 32 characters
 */
export const getNonce = () => {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

/**
 * Get a URI for the webview
 * This function converts a local file path to a webview URI, which is used to load resources in the webview.
 * @param webview - The Webview instance
 * @param extensionUri - The base URI of the extension
 * @param pathList - An array of path segments to join with the extension URI
 * @returns A webview URI
 */
export const getUri = (webview: Webview, extensionUri: Uri, pathList: string[]) => {
    return webview.asWebviewUri(Uri.joinPath(extensionUri, ...pathList));
};

/**
 * Get the current working directory for a given resource
 * This function determines the workspace folder for a given resource URI, or falls back to the parent directory if not found.
 * @param resource - The resource URI
 * @returns The file system path of the current working directory
 */
export const getCwd = (resource: Uri): string => {
    return (
        workspace.getWorkspaceFolder(resource)?.uri.fsPath ??
        workspace.workspaceFolders?.[0]?.uri.fsPath ??
        Uri.joinPath(resource, "..").fsPath
    );
};

/**
 * Notify the user of an error
 * This function displays an error message to the user and offers to show the output panel.
 * @param message - The error message to display
 * @returns A promise that resolves when the user has made a selection
 */
export const notifyError = async (message: string): Promise<void> => {
    if (process.env.VSCODE_TEST === "true") {
        window.showErrorMessage(message);
    } else {
        const selection = await window.showErrorMessage(message, "Show Output");
        if (selection === "Show Output") {
            showOutput();
        }
    }
};
