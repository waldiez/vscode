/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2024 - 2025 Waldiez & contributors
 */
import fs from "fs-extra";
import path from "path";
import url from "url";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");

const packageJson = fs.readJsonSync("package.json");
const vsixName = `${packageJson.name}-${packageJson.version}.vsix`;
const distFolder = path.join(rootDir, "dist");
const vsixSrc = path.join(rootDir, vsixName);
const vsixDest = path.join(distFolder, vsixName);

const cleanupFolder = (folder: string) => {
    const folderItems = fs.readdirSync(folder);
    for (const item of folderItems) {
        const entryPath = path.join(folder, item);
        const stat = fs.statSync(entryPath);
        if (stat.isFile()) {
            try {
                fs.rmSync(entryPath, { force: true });
            } catch (error) {
                console.warn(`Error deleting file: ${error.message}`);
            }
        }
        if (stat.isDirectory()) {
            try {
                fs.rmSync(entryPath, { recursive: true, force: true });
            } catch (error) {
                console.warn(`Error deleting folder: ${error.message}`);
                cleanupFolder(entryPath);
            }
        }
    }
};

const main = (): void => {
    if (!fs.existsSync(vsixSrc)) {
        console.error(`Error: ${vsixSrc} not found`);
        process.exit(1);
    }
    try {
        cleanupFolder(distFolder);
    } catch (error) {
        console.warn(`Error cleaning up dist folder: ${error.message}`);
    }
    fs.copyFileSync(vsixSrc, vsixDest);
};

main();
