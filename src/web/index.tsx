/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2024 - 2026 Waldiez & contributors
 */
import React from "react";
import ReactDOM from "react-dom/client";

import { nanoid } from "nanoid";

import "@waldiez/react/dist/@waldiez.css";

import { App } from "./App";
import "./index.css";

export const startApp = () => {
    const flowId = document.querySelector('meta[property="csp-nonce"]')?.getAttribute("content") ?? nanoid();
    //  <meta property="monaco-root" content="${monacoRoot}" />
    const monacoVsPath =
        document.querySelector('meta[property="monaco-root"]')?.getAttribute("content") || undefined;
    ReactDOM.createRoot(document.getElementById("root")!).render(
        <React.StrictMode>
            <div data-vscode-context='{"webviewSection": "main", "preventDefaultContextMenuItems": true}'>
                <App flowId={flowId} monacoVsPath={monacoVsPath} />
            </div>
        </React.StrictMode>,
    );
};

startApp();
