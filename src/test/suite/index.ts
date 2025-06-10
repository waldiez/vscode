/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2024 - 2025 Waldiez & contributors
 */
import { glob } from "glob";
import Mocha from "mocha";
import path from "path";

import { beforeTests } from "./beforeTests";

const isWIndows = process.platform === "win32";

const setupCoverage = () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const NYC = require("nyc");
    const nyc = new NYC({
        cwd: path.resolve(__dirname, "..", "..", ".."),
        include: ["dist"],
        exclude: ["!**/node_modules/", "!**/test/", "!**/coverage/"],
        // on windows we get:
        // Error: Path contains invalid characters:
        // d:\a\vscode\vscode\coverage\lcov-report\dist\webpack:\waldiez-vscode...
        reporter: isWIndows ? ["text", "text-summary"] : ["text", "text-summary", "lcov"],
        all: true,
        // sourceMap: false,
        sourceMap: true,
        instrument: false,
        hookRequire: true,
        hookRunInContext: true,
        hookRunInThisContext: true,
    });

    nyc.reset();
    nyc.wrap();

    return nyc;
};

export async function run(): Promise<void> {
    const testsRoot = path.resolve(__dirname, "..");

    console.log("Waiting for Python environments to be ready");
    await beforeTests();
    // Create the mocha test
    const mocha = new Mocha({
        ui: "tdd",
        color: true,
        bail: true,
        fullTrace: true,
        timeout: 300000,
    });

    const nyc = setupCoverage();

    // Discover and add test files to Mocha
    const files = await new Promise<string[]>((resolve, reject) => {
        glob("**/**.test.js", { cwd: testsRoot }, (err, files) => {
            if (err) {
                reject(err);
            } else {
                resolve(files);
            }
        });
    });

    files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));
    let success = true;
    try {
        await new Promise<void>((resolve, reject) => {
            mocha.run(failures => (failures ? reject(new Error(`${failures} tests failed`)) : resolve()));
        });
    } catch (err) {
        console.error(err);
        success = false;
    } finally {
        if (!success) {
            process.exit(1);
        }
        if (nyc) {
            nyc.writeCoverageFile();
            await nyc.report();
        }
    }
}
