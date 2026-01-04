/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2024 - 2026 Waldiez & contributors
 */
import * as assert from "assert";
import { afterEach, before, beforeEach, suite, test } from "mocha";
import * as sinon from "sinon";
import * as vscode from "vscode";

import packageJSON from "../../../../package.json";

const extensionId = `${packageJSON.publisher}.${packageJSON.name}`;
suite("Host utils Tests", () => {
    // noinspection DuplicatedCode
    let sandbox: sinon.SinonSandbox;

    before(async () => {
        const ext = vscode.extensions.getExtension(extensionId);
        if (!ext) {
            throw new Error(`Extension ${extensionId} not found`);
        }
        await ext.activate();
        await new Promise(resolve => setTimeout(resolve, 500));
    });

    beforeEach(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
    });
    suite("Utils", () => {
        let utils: any;

        before(async () => {
            try {
                utils = await import("../../../host/utils");
            } catch (error) {
                console.warn("Could not import utils:", error);
            }
        });

        test("should generate nonce", function () {
            if (!utils?.getNonce) {
                this.skip();
            }

            const nonce1 = utils.getNonce();
            const nonce2 = utils.getNonce();

            assert.strictEqual(typeof nonce1, "string");
            assert.strictEqual(nonce1.length, 32);
            assert.notStrictEqual(nonce1, nonce2);
        });

        test("should get webview URI", function () {
            if (!utils?.getUri) {
                this.skip();
            }

            const mockWebview = {
                asWebviewUri: sandbox.stub().returns(vscode.Uri.parse("vscode-webview://test/path")),
            };
            const extensionUri = vscode.Uri.parse("file:///extension");
            const pathSegments = ["dist", "main.js"];

            const result = utils.getUri(mockWebview as any, extensionUri, pathSegments);

            sinon.assert.calledOnce(mockWebview.asWebviewUri);
            assert.strictEqual(result.toString(), "vscode-webview://test/path");
        });
    });
});
