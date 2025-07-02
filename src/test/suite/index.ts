/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2024 - 2025 Waldiez & contributors
 */
import { glob } from "glob";
import Mocha from "mocha";
import path from "path";

import { beforeTests } from "./beforeTests";

export async function run(): Promise<void> {
    // make sure the python extension is activated and ready
    await beforeTests();

    // Create the mocha test
    const mocha = new Mocha({
        ui: "tdd",
        color: true,
        timeout: 300000,
    });

    const testsRoot = path.resolve(__dirname, "..");

    // Add test files to the test suite
    const files = glob.sync("**/**.test.js", { cwd: testsRoot });

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
