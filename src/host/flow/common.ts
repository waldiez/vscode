import { traceError, traceInfo, traceWarn } from "../log/logging";
import { spawnSync } from "child_process";
import * as vscode from "vscode";

const MINIMUM_REQUIRED_WALDIEZ_PY_VERSION = "0.4.6";

/**
 * Ensures that the `waldiez` Python module is available in the current Python environment.
 *
 * If the module is not found, it attempts to install it using `pip`.
 *
 * @param executable - The path to the Python executable.
 * @returns A Promise that resolves if the `waldiez` module is available or successfully installed,
 *          and rejects if an error occurs during the process.
 */
export const ensureWaldiezPy = (executable: string | undefined): Promise<void> => {
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
                traceWarn("Waldiez Python module not found in the current Python environment. Installing...");
                return installWaldiezPy(executable).then(resolve, reject);
            }
        } catch (error) {
            traceError("Failed to check waldiez version:", error);
            return installWaldiezPy(executable).then(resolve, reject);
        }
    });
};

const installWaldiezPy = (executable: string) => {
    return new Promise<void>((resolve, reject) => {
        vscode.window.showInformationMessage(
            "Waldiez Python module not found in the current Python environment. Installing...",
        );
        try {
            const result = spawnSync(executable, [
                "-m",
                "pip",
                "install",
                "--upgrade",
                "--break-system-packages",
                `waldiez>=${MINIMUM_REQUIRED_WALDIEZ_PY_VERSION}`,
            ]);
            if (result.status === 0) {
                traceInfo(result.stdout.toString());
                traceInfo("Waldiez Python module installed successfully");
                return resolve();
            } else {
                traceError("Failed to install Waldiez Python module");
                traceError(result.stderr.toString());
                vscode.window.showErrorMessage(
                    "Failed to install Waldiez Python module. Please check your Python environment.",
                );
                return reject();
            }
        } catch (error) {
            traceError("Failed to install Waldiez Python module:", error);
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
