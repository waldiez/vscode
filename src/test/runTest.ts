/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2024 - 2025 Waldiez & contributors
 */
import {
    downloadAndUnzipVSCode,
    resolveCliArgsFromVSCodeExecutablePath,
    runTests,
} from "@vscode/test-electron";
import { spawnSync } from "child_process";
import fs from "fs-extra";
import { glob } from "glob";
import path from "path";

const isWIndows = process.platform === "win32";

const main = async (): Promise<void> => {
    const extensionRoot = path.resolve(__dirname, "../../");

    const originalCwd = process.cwd();
    process.chdir(extensionRoot);

    try {
        const extensionTestsPath = path.resolve(__dirname, "./suite/index");
        const workspacePath = path.resolve(__dirname, "../../examples");
        const vscodeExecutablePath = await downloadAndUnzipVSCode();
        const [cliPath, ...args] = resolveCliArgsFromVSCodeExecutablePath(vscodeExecutablePath);

        spawnSync(cliPath, [...args, "--install-extension", "ms-python.python", "--force"], {
            encoding: "utf-8",
            stdio: "inherit",
            shell: isWIndows,
        });

        const launchArgs = [
            "--disable-updates",
            "--disable-crash-reporter",
            "--disable-telemetry",
            "--disable-gpu",
            "--no-sandbox",
            "--disable-chromium-sandbox",
            "--sync",
            "off",
            "--log",
            "debug",
            `--extensionDevelopmentPath=${extensionRoot}`,
            workspacePath,
        ];

        await runTests({
            vscodeExecutablePath,
            extensionDevelopmentPath: extensionRoot,
            extensionTestsPath,
            launchArgs,
        });

        await cleanUp();
    } catch (err) {
        await cleanUp();
        console.error(err);
        console.error("Failed to run tests");
        process.exit(1);
    } finally {
        // Restore original working directory
        process.chdir(originalCwd);
    }
};

const cleanUp = async () => {
    // remove any .py or .ipynb files in the examples directory
    const examplesDir = path.resolve(__dirname, "..", "..", "examples");
    const pyFiles = glob.sync("**/*.py", { cwd: examplesDir });
    const ipynbFiles = glob.sync("**/*.ipynb", { cwd: examplesDir });
    const pngFiles = glob.sync("**/*.png", { cwd: examplesDir });
    const mmdFiles = glob.sync("**/*.mmd", { cwd: examplesDir });
    const files = [...pyFiles, ...ipynbFiles, ...pngFiles, ...mmdFiles];
    for (const file of files) {
        await fs.remove(path.resolve(examplesDir, file));
    }
    const waldiezOutDir = path.resolve(examplesDir, "waldiez_out");
    if (fs.existsSync(waldiezOutDir)) {
        await fs.remove(waldiezOutDir);
    }
};

main();
