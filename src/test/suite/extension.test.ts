/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2024 - 2026 Waldiez & contributors
 */
import * as assert from "assert";
import { before, suite, test } from "mocha";
import * as vscode from "vscode";

import packageJSON from "../../../package.json";

const extensionId = `${packageJSON.publisher}.${packageJSON.name}`;

suite("Extension Test Suite", () => {
    before(async () => {
        await vscode.extensions.getExtension(extensionId)?.activate();
    });

    test("It should be present and active", () => {
        const extension = vscode.extensions.getExtension(extensionId);
        assert.ok(extension);
        assert.strictEqual(extension?.isActive, true);
    });

    test("it should register the language", async () => {
        const languages = await vscode.languages.getLanguages();
        assert.ok(languages.includes("waldiez"));
    });

    test("it should have the correct package.json", () => {
        const extension = vscode.extensions.getExtension(extensionId);
        assert.strictEqual(extension?.packageJSON.name, packageJSON.name);
        assert.strictEqual(extension?.packageJSON.publisher, packageJSON.publisher);
        assert.strictEqual(extension?.packageJSON.version, packageJSON.version);
    });
    test("it should handle opening a waldiez file", async () => {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        assert.ok(workspaceFolder, "No workspace folder found");
        const uri = vscode.Uri.joinPath(workspaceFolder.uri, "simple.waldiez");
        const document = await vscode.workspace.openTextDocument(uri);
        assert.strictEqual(document.languageId, packageJSON.contributes.languages[0].id);
    });
});
