import { waitForPythonEnvironments } from '../waitForPythonEnvironments';
import { glob } from 'glob';
import Mocha from 'mocha';
import path from 'path';

function setupCoverage() {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const NYC = require('nyc');
    const nyc = new NYC({
        cwd: path.resolve(__dirname, '..', '..', '..'),
        include: ['dist'],
        exclude: ['!**/node_modules/', '!**/test/', '!**/coverage/'],
        reporter: ['text', 'text-summary', 'lcov'],
        all: true,
        // sourceMap: false,
        sourceMap: true,
        instrument: false,
        hookRequire: true,
        hookRunInContext: true,
        hookRunInThisContext: true
    });

    nyc.reset();
    nyc.wrap();

    return nyc;
}
export async function run(): Promise<void> {
    const testsRoot = path.resolve(__dirname, '..');

    // Create the mocha test
    const mocha = new Mocha({
        ui: 'tdd',
        color: true,
        bail: true,
        fullTrace: true,
        timeout: 60000
    });
    // Wait for Python environments to be ready
    await waitForPythonEnvironments();

    const nyc = setupCoverage();

    // Discover and add test files to Mocha
    const files = await new Promise<string[]>((resolve, reject) => {
        glob('**/**.test.js', { cwd: testsRoot }, (err, files) => {
            if (err) {
                reject(err);
            } else {
                resolve(files);
            }
        });
    });

    files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

    try {
        await new Promise<void>((resolve, reject) => {
            mocha.run(failures =>
                failures
                    ? reject(new Error(`${failures} tests failed`))
                    : resolve()
            );
        });
    } catch (err) {
        console.error(err);
    } finally {
        if (nyc) {
            nyc.writeCoverageFile();
            await nyc.report();
        }
    }
}
