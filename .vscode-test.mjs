import { defineConfig } from '@vscode/test-cli';
import * as path from 'path';
import * as url from 'url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
    files: 'dist/test/**/*.test.js',
    extensionDevelopmentPath: __dirname,
    workspaceFolder: path.resolve(__dirname, 'example'),
    launchArgs: [
        '--disable-extensions',
        '--disable-gpu',
        '--no-sandbox',
        '--profile-temp',
        '--new-window',
        '--sync',
        'off',
        '--log',
        'critical'
    ]
});
