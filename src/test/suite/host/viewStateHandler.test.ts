/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2024 - 2025 Waldiez & contributors
 */
import { afterEach, before, beforeEach, suite, test } from "mocha";
import * as sinon from "sinon";
import * as vscode from "vscode";

import packageJSON from "../../../../package.json";

const extensionId = `${packageJSON.publisher}.${packageJSON.name}`;
suite("ViewStateHandler Tests", () => {
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
    suite("ViewStateHandler", () => {
        let ViewStateHandler: any;

        let clock: sinon.SinonFakeTimers;

        before(async () => {
            try {
                const module = await import("../../../host/viewStateHandler");
                ViewStateHandler = module.ViewStateHandler;
            } catch (error) {
                console.warn("Could not import ViewStateHandler:", error);
            }
        });

        beforeEach(() => {
            clock = sandbox.useFakeTimers();
        });

        afterEach(() => {
            clock.restore();
        });

        test("should call onVisible after stability period", function () {
            if (!ViewStateHandler) {
                console.warn("Skipping ....");
                this.skip();
            }

            const onVisibleSpy = sandbox.spy();
            const onHiddenSpy = sandbox.spy();
            const handler = new ViewStateHandler(onVisibleSpy, onHiddenSpy);

            handler.handleStateChange(true);

            // Before stability period
            clock.tick(500);
            sinon.assert.notCalled(onVisibleSpy);

            // After stability period
            clock.tick(600);
            sinon.assert.calledOnce(onVisibleSpy);
        });

        test("should call onHidden after stability period", function () {
            if (!ViewStateHandler) {
                console.warn("Skipping ....");
                this.skip();
            }

            const onVisibleSpy = sandbox.spy();
            const onHiddenSpy = sandbox.spy();
            const handler = new ViewStateHandler(onVisibleSpy, onHiddenSpy);

            // Set initial state to visible
            handler.handleStateChange(true);
            clock.tick(1100);
            sinon.assert.calledOnce(onVisibleSpy);

            // Change to hidden
            handler.handleStateChange(false);
            clock.tick(1100);
            sinon.assert.calledOnce(onHiddenSpy);
        });

        test("should debounce rapid state changes", function () {
            if (!ViewStateHandler) {
                console.warn("Skipping ....");
                this.skip();
            }

            const onVisibleSpy = sandbox.spy();
            const onHiddenSpy = sandbox.spy();
            const handler = new ViewStateHandler(onVisibleSpy, onHiddenSpy);

            // Rapid changes
            handler.handleStateChange(true);
            clock.tick(200);
            handler.handleStateChange(false);
            clock.tick(200);
            handler.handleStateChange(true);
            clock.tick(200);

            // No callbacks should be called yet
            sinon.assert.notCalled(onVisibleSpy);
            sinon.assert.notCalled(onHiddenSpy);

            // After stability period from last change
            clock.tick(1000);
            sinon.assert.calledOnce(onVisibleSpy);
            sinon.assert.notCalled(onHiddenSpy);
        });

        test("should not call callback if state hasn't changed", function () {
            if (!ViewStateHandler) {
                console.warn("Skipping ....");
                this.skip();
            }

            const onVisibleSpy = sandbox.spy();
            const onHiddenSpy = sandbox.spy();
            const handler = new ViewStateHandler(onVisibleSpy, onHiddenSpy);

            // Set initial state
            handler.handleStateChange(true);
            clock.tick(1100);
            sinon.assert.calledOnce(onVisibleSpy);

            // Same state again
            handler.handleStateChange(true);
            clock.tick(1100);
            sinon.assert.calledOnce(onVisibleSpy); // Still only one call
        });

        test("should dispose properly", function () {
            if (!ViewStateHandler) {
                console.warn("Skipping ....");
                this.skip();
            }

            const onVisibleSpy = sandbox.spy();
            const onHiddenSpy = sandbox.spy();
            const handler = new ViewStateHandler(onVisibleSpy, onHiddenSpy);

            handler.handleStateChange(true);
            handler.dispose();

            clock.tick(1100);
            sinon.assert.notCalled(onVisibleSpy);
        });
    });
});
