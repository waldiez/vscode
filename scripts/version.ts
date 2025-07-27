/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2024 - 2025 Waldiez & contributors
 */
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import url from "url";

// @ts-expect-error import.meta meta-property
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const showHelp = (status: number = 1): void => {
    console.log("Usage: node --import=tsx|bun version.ts [--get | --set <version>]");
    process.exit(status);
};

const validateArgs = (): void => {
    if (process.argv.length < 3) {
        console.error("Error: No arguments provided");
        showHelp();
    }
    const action = process.argv[2];
    if (action !== "--get" && action !== "--set") {
        console.error("Error: Invalid action provided");
        showHelp();
    }
    if (process.argv.length < 4 && process.argv[2] === "--set") {
        console.error("Error: No version provided");
        showHelp();
    }
    if (process.argv.length > 4) {
        console.error("Error: Too many arguments provided");
        showHelp();
    }
    if (process.argv[2] === "--set") {
        const version = process.argv[3];
        if (!/^\d+\.\d+\.\d+$/.test(version)) {
            console.error("Error: Invalid version provided");
            showHelp();
        }
    }
};

const getVersion = (): string => {
    const packageJsonPath = path.join(__dirname, "..", "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    return packageJson.version;
};

const updateWaldiezDependencyVersion = (version: string): void => {
    const packageJsonPath = path.join(__dirname, "..", "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    let gotWaldiez = false;
    Object.keys(packageJson.dependencies).forEach(dependency => {
        if (dependency.startsWith("@waldiez/react")) {
            gotWaldiez = true;
            packageJson.dependencies[dependency] = `^${version}`;
        }
    });
    if (!gotWaldiez) {
        Object.keys(packageJson.devDependencies).forEach(dependency => {
            if (dependency.startsWith("@waldiez/react")) {
                gotWaldiez = true;
                packageJson.devDependencies[dependency] = `^${version}`;
            }
        });
    }
    if (!gotWaldiez) {
        console.error("Error: @waldiez/react not found in dependencies");
        process.exit(1);
    }
    writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 4)}\n`, { encoding: "utf8" });
    // the new version might not be available in the registry yet
    // execSync("yarn install", { stdio: "inherit", cwd: path.join(__dirname, "..") });
};

const updateWaldiezPyRequirement = (version: string) => {
    // .. also update the version in ../src/host/flow/common.ts:
    //it has sth like: `const MINIMUM_REQUIRED_WALDIEZ_PY_VERSION = "0.1.20";`
    //update the version in the string
    const commonTsPath = path.join(__dirname, "..", "src", "host", "flow", "common.ts");
    const commonTs = readFileSync(commonTsPath, "utf8");
    const updatedCommonTs = commonTs.replace(
        /const MINIMUM_REQUIRED_WALDIEZ_PY_VERSION = "\d+\.\d+\.\d+";/,
        `const MINIMUM_REQUIRED_WALDIEZ_PY_VERSION = "${version}";`,
    );
    writeFileSync(commonTsPath, updatedCommonTs);
};

const setVersion = (version: string): void => {
    const packageJsonPath = path.join(__dirname, "..", "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    packageJson.version = version;
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 4));
};

const main = (): void => {
    validateArgs();
    const action = process.argv[2];
    if (action === "--get") {
        console.log(getVersion());
    } else if (action === "--set") {
        const version = process.argv[3];
        setVersion(version);
        updateWaldiezDependencyVersion(version);
        updateWaldiezPyRequirement(version);
    }
};

main();
