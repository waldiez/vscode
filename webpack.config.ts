import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import * as path from 'path';
import TerserPlugin from 'terser-webpack-plugin';
import * as webpack from 'webpack';

let mode = process.argv.includes('--mode')
    ? process.argv[process.argv.indexOf('--mode') + 1]
    : 'development';

if (!['development', 'production'].includes(mode)) {
    mode = 'production';
}
console.log(`Building in ${mode} mode`);
const cacheDirectory = path.resolve(__dirname, '.webpack');
const isDev = mode === 'development';

const extensionConfig: webpack.Configuration = {
    target: 'node',
    entry: './src/extension.ts',
    cache: isDev ? { type: 'filesystem', cacheDirectory } : false,
    devtool: isDev ? 'source-map' : false,
    output: {
        filename: 'extension.js',
        libraryTarget: 'commonjs2',
        path: path.resolve(__dirname, 'dist')
    },
    resolve: { extensions: ['.ts', '.js'] },
    module: { rules: [{ test: /\.ts$/, loader: 'ts-loader' }] },
    optimization: {
        minimize: true,
        minimizer: [new TerserPlugin()]
    },
    externals: { vscode: 'commonjs vscode' },
    infrastructureLogging: {
        level: 'log' // enables logging required for problem matchers
    }
};
const webviewConfig: webpack.Configuration = {
    target: 'web',
    entry: './src/web/index.tsx',
    cache: isDev ? { type: 'filesystem', cacheDirectory } : false,
    devtool: isDev ? 'source-map' : false,
    plugins: [new MiniCssExtractPlugin()],
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist')
    },
    resolve: {
        extensions: ['.js', '.ts', '.tsx', '.css']
    },
    externals: {
        vscode: 'commonjs vscode'
    },
    module: {
        rules: [
            { test: /\.tsx?$/, use: ['babel-loader', 'ts-loader'] },
            {
                test: /\.css$/,
                use: [MiniCssExtractPlugin.loader, 'css-loader']
            }
        ]
    },
    optimization: {
        minimize: true,
        minimizer: [new TerserPlugin()]
    },
    performance: {
        hints: false,
        maxEntrypointSize: 512000,
        maxAssetSize: 512000
    },
    infrastructureLogging: {
        level: 'log' // enables logging required for problem matchers
    }
};
export default [webviewConfig, extensionConfig];
