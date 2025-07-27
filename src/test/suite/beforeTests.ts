/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2024 - 2025 Waldiez & contributors
 */
import { Environment, PythonExtension, ResolvedEnvironment } from "@vscode/python-extension";
import { spawnSync } from "child_process";
import * as vscode from "vscode";

const MIN_PY_MINOR_VERSION = 10;
const MAX_PY_MINOR_VERSION = 13;

export const beforeTests = async (): Promise<void> => {
    await vscode.extensions.getExtension("ms-python.python")?.activate();
    await waitForPythonEnvironments();
    const resolved = await resolveEnvironment();
    if (!resolved) {
        throw new Error("No suitable Python environment found");
    }

    console.log(`Using Python environment: ${resolved.path}`);
};

const waitForPythonEnvironments = async () => {
    const pythonApi: PythonExtension = await PythonExtension.api();
    const environments = pythonApi.environments;
    const maxRetries = 30; // Maximum retries to wait for environments
    let retries = 0;
    while (environments.known.length === 0 && retries < maxRetries) {
        console.log(`Attempt ${retries + 1}: Waiting for 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        retries++;
        await environments.refreshEnvironments();
    }
};

// eslint-disable-next-line max-statements
const resolveEnvironment = async (): Promise<ResolvedEnvironment | undefined> => {
    const api = await PythonExtension.api();
    await api.environments.refreshEnvironments();
    const sorted = [...api.environments.known]
        .filter(env => env.version?.major === 3)
        .sort((a, b) => (b.version?.minor ?? 0) - (a.version?.minor ?? 0));

    console.log(`Found ${sorted.length} Python 3 environments`);
    if (sorted.length === 0) {
        console.warn("No Python 3 environments found");
        return undefined;
    }

    const virtualEnv = sorted.find(env => isInVirtualEnv(env));
    if (virtualEnv) {
        const resolved = await api.environments.resolveEnvironment(virtualEnv);
        if (resolved && isVersionAllowed(resolved)) {
            return resolved;
        }
    }

    if (sorted[0].version?.minor === 13) {
        const fallback = sorted.find(env => env.version?.minor === 12);
        if (fallback) {
            const resolved = await api.environments.resolveEnvironment(fallback);
            if (resolved && isVersionAllowed(resolved)) {
                return resolved;
            }
        }
    }

    for (const env of sorted) {
        const resolved = await api.environments.resolveEnvironment(env);
        if (resolved && isVersionAllowed(resolved)) {
            return resolved;
        }
    }

    return undefined;
};

const isVersionAllowed = (env: ResolvedEnvironment) =>
    env.version?.major === 3 &&
    env.version?.minor !== null &&
    env.version.minor >= MIN_PY_MINOR_VERSION &&
    env.version.minor <= MAX_PY_MINOR_VERSION;

const isInVirtualEnv = (env: Environment): boolean => {
    if (!env.executable.uri) {
        return false;
    }

    const script =
        "import os,sys; print(hasattr(sys, 'base_prefix') and os.path.realpath(sys.base_prefix) != os.path.realpath(sys.prefix))";

    try {
        const result = spawnSync(env.executable.uri.fsPath, ["-c", script], {
            encoding: "utf-8",
            shell: true,
        });
        return result.stdout.trim() === "True";
    } catch {
        return false;
    }
};
