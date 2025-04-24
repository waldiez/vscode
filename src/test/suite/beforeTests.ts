import { Environment, PythonExtension, ResolvedEnvironment } from "@vscode/python-extension";
import { spawnSync } from "child_process";
import * as vscode from "vscode";

const MIN_PY_MINOR_VERSION = 10;
const MAX_PY_MINOR_VERSION = 13;

export const beforeTests = async (): Promise<void> => {
    await vscode.extensions.getExtension("ms-python.python")?.activate();
    await waitForPythonEnvironments();
    const api = await PythonExtension.api();
    const resolved = await getResolvedEnvironment(api);
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

const getResolvedEnvironment: (
    api: PythonExtension,
) => Promise<ResolvedEnvironment | undefined> = async api => {
    // only use python3.x, and sort environments by minor version in descending order
    const sorted = [...api.environments.known]
        .filter(env => env.version?.major === 3)
        .sort(orderedByMinorReverse);
    if (sorted.length === 0) {
        console.error("No valid python interpreter found");
        return undefined;
    }
    console.log(
        "Found Python environments:",
        sorted.map(env => env.path),
    );
    // if any of the ones found are in a virtual environment, let's prefer those
    const index = sorted.findIndex(env => isInVirtualEnv(env));
    if (index > -1) {
        console.log("Found Python environment in virtual environment:", sorted[index].path);
        const resolved = await api.environments.resolveEnvironment(sorted[index]);
        if (resolved && isVersionAllowed(resolved)) {
            return resolved;
        }
    }
    // if the first is 3.13, let's prefer 3.12 instead (more extras can be used on ag2)
    if (sorted[0].version?.minor === 13) {
        const index = sorted.findIndex(env => env.version?.minor === 12);
        if (index > -1) {
            const resolved = await api.environments.resolveEnvironment(sorted[index]);
            if (resolved && isVersionAllowed(resolved)) {
                return resolved;
            }
        }
    }
    // Log the sorted Python environments
    console.log("Python environments:", sorted);
    // Find the first valid Python environment
    for (const environment of sorted) {
        const resolved = await api!.environments.resolveEnvironment(environment);
        if (resolved && isVersionAllowed(resolved)) {
            return resolved;
        }
    }
    return undefined;
};
const orderedByMinorReverse = (a: Environment, b: Environment) => {
    if (!a.version || !b.version || !a.version.minor || !b.version.minor) {
        return 0;
    }
    if (a.version.minor > b.version.minor) {
        return -1;
    }
    if (a.version.minor < b.version.minor) {
        return 1;
    }
    return 0;
};
const isVersionAllowed = (environment: ResolvedEnvironment) => {
    const version = environment.version;
    if (!version || !version.major || !version.minor) {
        return false;
    }
    return (
        version.major === 3 && version.minor >= MIN_PY_MINOR_VERSION && version.minor <= MAX_PY_MINOR_VERSION
    );
};
const isInVirtualEnv = (env: Environment) => {
    if (!env.executable.uri) {
        return false;
    }
    // import os,sys; print(hasattr(sys, "base_prefix") and os.path.realpath(sys.base_prefix) != os.path.realpath(sys.prefix))
    const toRun =
        "import os,sys; print(hasattr(sys, 'base_prefix') and os.path.realpath(sys.base_prefix) != os.path.realpath(sys.prefix))";
    try {
        //
        const output = spawnSync(env.executable.uri.fsPath, ["-c", toRun], {
            encoding: "utf-8",
            shell: true,
        });
        if (output.error) {
            console.error("Error checking if in virtual environment:", output.error);
            return false;
        }
        const result = output.stdout.trim();
        if (result === "True") {
            return true;
        }
        return false;
    } catch (e) {
        console.error("Error checking if in virtual environment:", e);
        return false;
    }
};
