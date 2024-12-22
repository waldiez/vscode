/* handle version updates

if `--get` is passed, return the current version (x.y.z format)
if `--set` is passed, set the version to the value of the next argument
if `--set` validate that it is a valid version(x.y.z format)
*/
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import url from "url";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
function showHelp(status: number = 1): void {
    console.log("Usage: node --import=tsx|bun version.ts [--get | --set <version>]");
    process.exit(status);
}

function validateArgs(): void {
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
}

function getVersion(): string {
    const packageJsonPath = path.join(__dirname, "..", "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    return packageJson.version;
}

function setVersion(version: string): void {
    const packageJsonPath = path.join(__dirname, "..", "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    packageJson.version = version;
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 4));
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
}

function main(): void {
    validateArgs();
    const action = process.argv[2];
    if (action === "--get") {
        console.log(getVersion());
    } else if (action === "--set") {
        setVersion(process.argv[3]);
    }
}

main();
