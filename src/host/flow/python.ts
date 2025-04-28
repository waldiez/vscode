// Flow runner using a Python interpreter
import { showOutput, traceError, traceVerbose } from "../log/logging";
import { Environment, PythonExtension, ResolvedEnvironment } from "@vscode/python-extension";
import { spawnSync } from "child_process";
import { Disposable } from "vscode";

const MIN_PY_MINOR_VERSION = 10;
const MAX_PY_MINOR_VERSION = 13;

let _api: PythonExtension | undefined;

/**
 * A wrapper for handling Python interpreter environments using the VS Code Python extension.
 */
export class PythonWrapper {
    _environment: ResolvedEnvironment | undefined;
    _onChangePythonInterpreter?: (allowed: boolean) => void;

    /**
     * Constructs a PythonWrapper instance.
     *
     * @param environment - The initial resolved Python environment.
     * @param disposables - Array to store disposables for cleanup.
     * @param onChangePythonInterpreter - Optional callback for when the Python interpreter changes.
     */
    constructor(
        environment: ResolvedEnvironment | undefined,
        disposables: Disposable[],
        onChangePythonInterpreter?: (allowed: boolean) => void,
    ) {
        this._environment = environment;
        this._onChangePythonInterpreter = onChangePythonInterpreter;

        // Listen for changes to the active Python environment
        if (_api) {
            disposables.push(
                _api?.environments.onDidChangeActiveEnvironmentPath(async e => {
                    const resolved = await _api?.environments.resolveEnvironment(e.path);
                    let allowed = false;
                    if (resolved && PythonWrapper.isVersionAllowed(resolved)) {
                        PythonWrapper.setActiveEnvironmentPath(resolved);
                        this._environment = resolved;
                        allowed = true;
                    }
                    if (this._onChangePythonInterpreter) {
                        this._onChangePythonInterpreter(allowed);
                    }
                }),
            );
        }
    }

    /**
     * Gets the current resolved Python environment.
     */
    public get environment() {
        return this._environment;
    }

    /**
     * Gets the executable path of the current Python interpreter.
     */
    public get executable() {
        if (!this._environment?.executable.uri) {
            return undefined;
        }
        return this._environment.executable.uri.fsPath;
    }

    /**
     * Returns the Python version as a string (e.g., "3.10.6 64-bit").
     */
    public pythonVersionString() {
        const pythonVersion = this._environment?.version;
        if (!pythonVersion) {
            return "Unknown";
        }
        return `${pythonVersion.major}.${pythonVersion.minor}.${pythonVersion.micro} ${this._environment?.executable.bitness ?? ""}`;
    }

    /**
     * Sets a callback function to handle changes to the Python interpreter.
     *
     * @param value - The callback function to invoke on interpreter change.
     */
    public setOnChangePythonInterpreter(value: (allowed: boolean) => void) {
        this._onChangePythonInterpreter = value;
    }

    /**
     * If the given Python environment is different from the active environment, updates the active environment.
     *
     * @param environment - The resolved Python environment to set as active.
     */
    static setActiveEnvironmentPath(environment: ResolvedEnvironment) {
        if (_api) {
            const currentActiveEnvironment = _api.environments.getActiveEnvironmentPath();
            if (currentActiveEnvironment.path !== environment.path) {
                _api.environments.updateActiveEnvironmentPath(environment.path);
            }
        }
    }

    /**
     * Checks if the given Python environment has a supported version.
     *
     * @param environment - The resolved Python environment to check.
     * @returns True if the environment is supported, false otherwise.
     */
    static isVersionAllowed(environment: ResolvedEnvironment) {
        const version = environment.version;
        if (!version || !version.major || !version.minor) {
            return false;
        }
        return (
            version.major === 3 &&
            version.minor >= MIN_PY_MINOR_VERSION &&
            version.minor <= MAX_PY_MINOR_VERSION
        );
    }

    /**
     * Creates a PythonWrapper instance with a valid Python environment.
     *
     * @param disposables - Array to store disposables for cleanup.
     * @param onChangePythonInterpreter - Optional callback for when the Python interpreter changes.
     * @returns A Promise resolving to a PythonWrapper instance or undefined if no valid interpreter is found.
     */
    static create: (
        disposables: Disposable[],
        onChangePythonInterpreter?: (allowed: boolean) => void,
    ) => Promise<PythonWrapper | undefined> = async (
        disposables: Disposable[],
        onChangePythonInterpreter,
    ) => {
            try {
                // Fetch the Python extension API
                _api = await PythonExtension.api();
            } catch (e) {
                showOutput();
                traceError("Failed to initialize Python extension:", e);
                return undefined;
            }

            if (!_api) {
                showOutput();
                traceError("No valid python interpreter found");
                return undefined;
            }
            const resolved = await PythonWrapper.getResolvedEnvironment();
            if (resolved && PythonWrapper.isVersionAllowed(resolved)) {
                PythonWrapper.setActiveEnvironmentPath(resolved);
                return new PythonWrapper(resolved, disposables, onChangePythonInterpreter);
            }
            showOutput();
            traceError("No valid python interpreter found");
            return undefined;
        };
    /**
     * Checks if the given Python environment is in a virtual environment.
     *
     * @param env - The Python environment to check.
     * @returns True if the environment is in a virtual environment, false otherwise.
     */
    static isInVirtualEnv: (env: Environment) => boolean = (env: Environment) => {
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
                traceError("Error checking if in virtual environment:", output.error);
                return false;
            }
            const result = output.stdout.trim();
            if (result === "True") {
                traceVerbose("Python executable is in a virtual environment");
                return true;
            }
            traceVerbose("Python executable is not in a virtual environment");
            return false;
        } catch (e) {
            traceError("Error checking if in virtual environment:", e);
            return false;
        }
    };

    static getResolvedEnvironment: () => Promise<ResolvedEnvironment | undefined> = async () => {
        // only use python3.x, and sort environments by minor version in descending order
        const sorted = [..._api!.environments.known]
            .filter(env => env.version?.major === 3)
            .sort(orderedByMinorReverse);
        if (sorted.length === 0) {
            traceError("No valid python interpreter found");
            showOutput();
            return undefined;
        }
        // if any of the ones found are in a virtual environment, let's prefer those
        const index = sorted.findIndex(env => PythonWrapper.isInVirtualEnv(env));
        if (index > -1) {
            const resolved = await _api!.environments.resolveEnvironment(sorted[index]);
            if (resolved && PythonWrapper.isVersionAllowed(resolved)) {
                return resolved;
            }
        }
        // if the first is 3.13, let's prefer 3.12 instead (more extras can be used on ag2)
        if (sorted[0].version?.minor === 13) {
            const index = sorted.findIndex(env => env.version?.minor === 12);
            if (index > -1) {
                const resolved = await _api!.environments.resolveEnvironment(sorted[index]);
                if (resolved && PythonWrapper.isVersionAllowed(resolved)) {
                    return resolved;
                }
            }
        }
        // Log the sorted Python environments
        traceVerbose("Python environments:", sorted);
        // Find the first valid Python environment
        for (const environment of sorted) {
            const resolved = await _api!.environments.resolveEnvironment(environment);
            if (resolved && PythonWrapper.isVersionAllowed(resolved)) {
                return resolved;
            }
        }
        return undefined;
    };
}

/**
 * Comparator function to sort Python environments by minor version in descending order.
 *
 * @param a - The first Python environment to compare.
 * @param b - The second Python environment to compare.
 * @returns -1 if `a` has a higher minor version, 1 if `b` has a higher minor version, 0 otherwise.
 */
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
