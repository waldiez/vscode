/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2024 - 2025 Waldiez & contributors
 */
import { spawnSync } from "child_process";
import * as vscode from "vscode";

import { MINIMUM_REQUIRED_WALDIEZ_PY_VERSION } from "../constants";
import { traceError, traceInfo, traceWarn } from "../log/logging";

/**
 * Ensures that the `waldiez` Python module is available in the current Python environment.
 *
 * If the module is not found, it attempts to install it using `pip`.
 *
 * @param executable - The path to the Python executable.
 * @returns A Promise that resolves if the `waldiez` module is available or successfully installed,
 *          and rejects if an error occurs during the process.
 */
/* eslint-disable max-statements */
export const ensureWaldiezPy = (executable: string | undefined): Promise<void> => {
    const isFromGit = MINIMUM_REQUIRED_WALDIEZ_PY_VERSION.startsWith("git+https");
    // noinspection TypeScriptUMDGlobal
    return new Promise<void>((resolve, reject) => {
        if (!executable) {
            // If no Python executable is provided, log an error and reject the promise
            traceError("Python extension not found");
            return reject();
        }

        try {
            const result = spawnSync(executable, ["-m", "waldiez", "--version"]);
            // check if the waldiez module is installed and the version is at least the minimum required
            if (result.status === 0) {
                if (isFromGit) {
                    return installWaldiezPy(executable, true).then(resolve, reject);
                }
                const commandOutput = result.stdout.toString().trim();
                const version = commandOutput.match(/(\d+\.\d+\.\d+)/)?.[0];
                if (!version) {
                    traceError("Failed to parse waldiez version");
                    return installWaldiezPy(executable).then(resolve, reject);
                }
                if (isVersionOK(version)) {
                    traceInfo(`Found Waldiez Python module version ${version}`);
                    resolve();
                    return;
                }
                traceWarn(
                    `Waldiez Python module version ${version} found, but version ${MINIMUM_REQUIRED_WALDIEZ_PY_VERSION} or higher is required. Updating...`,
                );
                return installWaldiezPy(executable).then(resolve, reject);
            } else {
                // If the module is not found, attempt to install it
                if (!isFromGit) {
                    traceWarn(
                        "Waldiez Python module not found in the current Python environment. Installing...",
                    );
                }
                return installWaldiezPy(executable).then(resolve, reject);
            }
        } catch (error) {
            traceError("Failed to check waldiez version:", error);
            return installWaldiezPy(executable).then(resolve, reject);
        }
    });
};

const installWaldiezPy = (executable: string, skipInfo: boolean = false) => {
    // noinspection TypeScriptUMDGlobal
    return new Promise<void>((resolve, reject) => {
        if (!skipInfo) {
            // noinspection JSIgnoredPromiseFromCall
            vscode.window.showInformationMessage(
                "Waldiez Python module not found in the current Python environment. Installing...",
            );
        }
        const toInstall = MINIMUM_REQUIRED_WALDIEZ_PY_VERSION.startsWith("git+https")
            ? ` @ ${MINIMUM_REQUIRED_WALDIEZ_PY_VERSION}`
            : `>=${MINIMUM_REQUIRED_WALDIEZ_PY_VERSION}`;
        try {
            const result = spawnSync(executable, [
                "-m",
                "pip",
                "install",
                "--upgrade",
                "--break-system-packages",
                `waldiez${toInstall}`,
            ]);
            if (result.status === 0) {
                traceInfo(result.stdout.toString());
                traceInfo("Waldiez Python module installed successfully");
                return resolve();
            } else {
                traceError("Failed to install Waldiez Python module");
                traceError(result.stderr.toString());
                // noinspection JSIgnoredPromiseFromCall
                vscode.window.showErrorMessage(
                    "Failed to install Waldiez Python module. Please check your Python environment.",
                );
                return reject();
            }
        } catch (error) {
            traceError("Failed to install Waldiez Python module:", error);
            // noinspection JSIgnoredPromiseFromCall
            vscode.window.showErrorMessage(
                "Failed to install Waldiez Python module. Please check your Python environment.",
            );
            return reject();
        }
    });
};

const isVersionOK = (version: string): boolean => {
    try {
        const [major, minor, patch] = version.split(".").map(Number);
        const [requiredMajor, requiredMinor, requiredPatch] =
            MINIMUM_REQUIRED_WALDIEZ_PY_VERSION.split(".").map(Number);
        return (
            major > requiredMajor ||
            (major === requiredMajor && minor > requiredMinor) ||
            (major === requiredMajor && minor === requiredMinor && patch >= requiredPatch)
        );
    } catch (error) {
        traceError("Failed to parse waldiez version:", error);
        return false;
    }
};
