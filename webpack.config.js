/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2024 - 2026 Waldiez & contributors
 */

const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const path = require("path");
const TerserPlugin = require("terser-webpack-plugin");
const webpack = require("webpack");

let mode = "development";
if (process.argv.includes("--mode")) {
    mode = process.argv[process.argv.indexOf("--mode") + 1];
}

if (!["development", "production"].includes(mode)) {
    mode = "production";
}
console.log(`Building in ${mode} mode`);

const cacheDirectory = path.resolve(__dirname, ".webpack");
const isDev = mode === "development";

// noinspection JSValidateJSDoc
/** @type webpack.Configuration */
const extensionConfig = {
    target: "node",
    entry: "./src/extension.ts",
    cache: isDev ? { type: "filesystem", cacheDirectory } : false,
    devtool: isDev ? "source-map" : false,
    plugins: [new MiniCssExtractPlugin()],
    output: {
        filename: "extension.js",
        libraryTarget: "commonjs2",
        path: path.resolve(__dirname, "dist"),
    },
    resolve: { extensions: [".ts", ".js"] },
    module: {
        rules: [
            { test: /\.ts$/, loader: "ts-loader" },
            {
                test: /\.css$/,
                use: [MiniCssExtractPlugin.loader, "css-loader"],
            },
        ],
    },
    optimization: {
        minimize: true,
        minimizer: [new TerserPlugin()],
    },
    externals: { vscode: "commonjs vscode" },
    infrastructureLogging: {
        level: "log",
    },
};

// noinspection JSValidateJSDoc
/** @type webpack.Configuration */
const webviewConfig = {
    target: "web",
    entry: "./src/web/index.tsx",
    cache: isDev ? { type: "filesystem", cacheDirectory } : false,
    devtool: isDev ? "source-map" : false,
    plugins: [new MiniCssExtractPlugin()],
    output: {
        filename: "[name].js",
        path: path.resolve(__dirname, "dist"),
    },
    resolve: {
        extensions: [".js", ".ts", ".tsx", ".css"],
    },
    externals: {
        vscode: "commonjs vscode",
    },
    module: {
        rules: [
            { test: /\.tsx?$/, use: ["babel-loader", "ts-loader"] },
            {
                test: /\.css$/,
                use: [MiniCssExtractPlugin.loader, "css-loader"],
            },
        ],
    },
    optimization: {
        minimize: true,
        minimizer: [new TerserPlugin()],
    },
    performance: {
        hints: false,
        maxEntrypointSize: 512000,
        maxAssetSize: 512000,
    },
    infrastructureLogging: {
        level: "log",
    },
};

module.exports = [webviewConfig, extensionConfig];
