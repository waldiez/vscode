/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2024 - 2025 Waldiez & contributors
 */
/**
 * Run python commands using the compatible python version.
 * If no virtual environment is found, it creates one.
 */
import { execSync } from "child_process";
import fs from "fs-extra";
import path from "path";
import url from "url";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const __rootDir = path.join(__dirname, "..");

const __me = path.relative(__rootDir, __filename);

const isWindows = process.platform === "win32";
const possibleVenvNames = [".venv", "venv"];
// we might want to set the order to our preferred python version
const possiblePys = ["python3.12", "python3.10", "python3.11", "python3.13", "python3", "python"];

/**
 * Check if the python version is greater than or equal to 3.10 and less than 3.14
 * @param pyCmd the python command to check
 * @returns true if the python version is compatible, false otherwise
 */
const isPyGte310lte314 = (pyCmd: string) => {
    let pythonVersion: string;
    try {
        pythonVersion = execSync(`${pyCmd} --version`, {
            stdio: ["pipe", "pipe", "ignore"],
        }).toString();
    } catch (_) {
        return false;
    }
    const version = pythonVersion.split(" ")[1];
    const [major, minor] = version.split(".").map(x => parseInt(x, 10));
    if (major !== 3 || minor < 10 || minor >= 14) {
        return false;
    }
    return true;
};

/**
 * Check if the python executable is in a virtual environment
 * @param pythonExecutable the python executable
 * @returns true if the python executable is in a virtual environment, false otherwise
 */
const inVenv = (pythonExecutable: string): boolean => {
    try {
        const toRun =
            "import os,sys; print(hasattr(sys, 'base_prefix') and os.path.realpath(sys.base_prefix) != os.path.realpath(sys.prefix))";
        const output = execSync(`${pythonExecutable} -c "${toRun}"`, {
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "ignore"],
        }).toString();
        return output.trim() === "True";
    } catch (_) {
        console.error("Error checking if in virtual environment");
        return false;
    }
};

/**
 * Get a compatible python executable
 * @returns the compatible python executable if found, null otherwise,
 * along with a boolean indicating if the python executable is in a virtual environment
 * if no compatible python is found
 */
const getCompatiblePythonExecutable = (): { path: string | null; virtualEnv: boolean } => {
    let pythonExec: string | null = null;
    for (const pyCmd of possiblePys) {
        try {
            execSync(`${pyCmd} --version`);
            if (isPyGte310lte314(pyCmd)) {
                pythonExec = pyCmd;
                break;
            }
        } catch (_) {
            continue;
        }
    }
    if (!pythonExec) {
        return { path: null, virtualEnv: false };
    }
    return { path: pythonExec, virtualEnv: inVenv(pythonExec) };
};
/**
 * Get the python executable from the virtual environment directory
 * @param venvDir the virtual environment directory
 * @returns the python executable
 */
const getVenvPythonExecutable = (venvDir: string) => {
    const venvPythonPath = isWindows
        ? path.join(venvDir, "Scripts", "python.exe")
        : path.join(venvDir, "bin", "python");
    return venvPythonPath;
};
/**
 * Get a new python executable
 * @returns the new python executable
 */
const getNewPythonExecutable = () => {
    console.info("No virtual environment found. Creating one...");
    const { path: pyThonExec } = getCompatiblePythonExecutable();
    if (!pyThonExec) {
        console.error("No compatible python found");
        process.exit(1);
    }
    const resolvedDir = path.resolve(__rootDir, possibleVenvNames[0]);
    execSync(`${pyThonExec} -m venv ${resolvedDir}`);
    const pythonPath = getVenvPythonExecutable(resolvedDir);
    execSync(`${pythonPath} -m pip install --upgrade pip jupyter`);
    return pythonPath;
};

/**
 * Check if we are in a CI environment
 * @returns true if we are in a CI environment, false otherwise
 */
const inCIEnv = (): boolean => {
    return process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";
};

/**
 * Get the python executable
 * @returns the python executable
 */
const tryGetPythonExecutable = (): string | null => {
    let { path: pythonPath, virtualEnv: found } = getCompatiblePythonExecutable();
    // if in CI, we don't need a new virtual environment
    const inCi = inCIEnv();
    if (inCi && pythonPath) {
        // if we are in CI and we found a compatible python, return it
        return pythonPath;
    }
    if (found) {
        // found: in venv already
        // if we are not in CI and we found a compatible python, return it
        return pythonPath;
    }
    if (!inCi) {
        const dirsToCheck: string[] = [];
        for (const venvName of possibleVenvNames) {
            const inExamples = path.join(__rootDir, "examples", venvName);
            dirsToCheck.push(inExamples);
            dirsToCheck.push(path.join(__rootDir, venvName));
        }
        // check if any of the possible venv directories exist
        for (const venvDir of dirsToCheck) {
            const venvPythonPath = getVenvPythonExecutable(venvDir);
            if (fs.existsSync(venvPythonPath)) {
                pythonPath = venvPythonPath;
                found = true;
                break;
            }
        }
    }
    return pythonPath || getNewPythonExecutable();
};

/**
 * Get the python executable
 * @returns the python executable
 */
const getPythonExecutable = (): string => {
    const pythonExec = tryGetPythonExecutable();
    if (!pythonExec) {
        console.error("No compatible python found");
        process.exit(1);
    }
    if (!inVenv(pythonExec)) {
        for (const venvName of possibleVenvNames) {
            const venvDir = path.join(__rootDir, venvName);
            const venvPythonPath = getVenvPythonExecutable(venvDir);
            if (fs.existsSync(venvPythonPath)) {
                return venvPythonPath;
            }
        }
    }
    return pythonExec;
};

/**
 * Show help
 */
const showHelp = () => {
    console.info(`\x1b[36mUsage: node --import=tsx ${__me} <args>`);
    console.info(
        "\x1b[36m\nExamples: \n" +
            "\nyarn python --version\n" +
            "node --import=tsx scripts/python.ts -m pip install -r requirements/all.txt\n" +
            "bun scripts/python.ts path/to/file.py\n",
    );
    process.exit(0);
};

/**
 * Get the actual path of the python executable
 * @param pythonExecutable the python executable
 * @returns the actual path of the python executable
 */
const getActualPath = (pythonExecutable: string): string => {
    const cmd = "import sys; print(sys.executable)";
    try {
        const output = execSync(`${pythonExecutable} -c "${cmd}"`).toString();
        return output.trim();
    } catch (err) {
        console.error("Error getting actual path of python executable:", (err as Error).message);
        process.exit(1);
    }
};

/**
 * Main function
 */
const main = () => {
    try {
        const cmd_args = process.argv.slice(2);
        if (cmd_args.length === 0 || cmd_args[0] === "-h" || cmd_args[0] === "--help") {
            showHelp();
        }
        const pythonExec = getActualPath(getPythonExecutable());
        const cmd_args_str = cmd_args.join(" ");
        console.log(`\x1b[36mRunning command: ${pythonExec} ${cmd_args_str}`);
        execSync(`${pythonExec} ${cmd_args_str}`, {
            stdio: "inherit",
        });
    } catch (err) {
        console.error("Error:", (err as Error).message);
        process.exit(1);
    }
};

main();
