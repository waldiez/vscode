// flow runner using a python interpreter
import {
    Environment,
    PythonExtension,
    ResolvedEnvironment
} from '@vscode/python-extension';
import { Disposable } from 'vscode';

let _api: PythonExtension | undefined;

export class PythonWrapper {
    _environment: ResolvedEnvironment | undefined;
    _onChangePythonInterpreter?: (allowed: boolean) => void;

    constructor(
        environment: ResolvedEnvironment | undefined,
        disposables: Disposable[],
        onChangePythonInterpreter?: (allowed: boolean) => void
    ) {
        this._environment = environment;
        this._onChangePythonInterpreter = onChangePythonInterpreter;
        if (_api) {
            disposables.push(
                _api?.environments.onDidChangeActiveEnvironmentPath(async e => {
                    const resolved =
                        await _api?.environments.resolveEnvironment(e.path);
                    let allowed = false;
                    if (resolved && PythonWrapper.isVersionAllowed(resolved)) {
                        this._environment = resolved;
                        allowed = true;
                    }
                    if (this._onChangePythonInterpreter) {
                        this._onChangePythonInterpreter(allowed);
                    }
                })
            );
        }
    }
    public get environment() {
        return this._environment;
    }
    public get executable() {
        if (!this._environment?.executable.uri) {
            return;
        }
        return this._environment.executable.uri.fsPath;
    }
    public pythonVersionString() {
        const pythonVersion = this._environment?.version;
        if (!pythonVersion) {
            return 'Unknown';
        }
        return `${pythonVersion.major}.${pythonVersion.minor}.${pythonVersion.micro} ${this._environment?.executable.bitness ?? ''}`;
    }
    public setOnChangePythonInterpreter(value: (allowed: boolean) => void) {
        this._onChangePythonInterpreter = value;
    }
    static isVersionAllowed(environment: ResolvedEnvironment) {
        const version = environment.version;
        if (!version || !version.major || !version.minor) {
            return false;
        }
        return version.major === 3 && version.minor >= 10 && version.minor < 13;
    }
    static create: (
        disposables: Disposable[],
        onChangePythonInterpreter?: (allowed: boolean) => void
    ) => Promise<PythonWrapper | undefined> = async (
        disposables: Disposable[],
        onChangePythonInterpreter
    ) => {
        try {
            _api = await PythonExtension.api();
        } catch (e) {
            console.error('Failed to initialize Python extension:', e);
            return;
        }
        if (!_api) {
            console.error('Python extension not found');
            return;
        }
        const sorted = [..._api.environments.known].sort(orderedByMinorReverse);
        for (const environment of sorted) {
            const resolved =
                await _api.environments.resolveEnvironment(environment);
            if (resolved && PythonWrapper.isVersionAllowed(resolved)) {
                return new PythonWrapper(
                    resolved,
                    disposables,
                    onChangePythonInterpreter
                );
            }
        }
        return new PythonWrapper(undefined, disposables);
    };
}

const orderedByMinorReverse = (a: Environment, b: Environment) => {
    if (!a.version || !b.version || !a.version.minor || !b.version.minor) {
        return 0;
    }
    if (a.version.minor > b.version?.minor) {
        return -1;
    }
    if (a.version.minor < b.version.minor) {
        return 1;
    }
    return 0;
};
