/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2024 - 2025 Waldiez & contributors
 */
import { glob } from "glob";
import Mocha from "mocha";
import path from "path";

export async function run(): Promise<void> {
    // Create the mocha test
    const mocha = new Mocha({
        ui: "tdd",
        color: true,
        timeout: 300000, // Keep your longer timeout for VSCode tests
    });

    const testsRoot = path.resolve(__dirname, "..");

    // Add test files to the test suite
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

    try {
        // Run the mocha test
        await new Promise<void>((resolve, reject) => {
            mocha.run(failures => {
                if (failures > 0) {
                    reject(new Error(`${failures} tests failed.`));
                } else {
                    resolve();
                }
            });
        });
    } catch (err) {
        console.error(err);
        throw err;
    }
}
