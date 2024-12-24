import { App } from "./App";
import "./index.css";
import { nanoid } from "nanoid";

import React from "react";
import ReactDOM from "react-dom/client";

import "@waldiez/react/dist/@waldiez.css";

export const startApp = () => {
    const flowId = document.querySelector('meta[property="csp-nonce"]')?.getAttribute("content") ?? nanoid();
    ReactDOM.createRoot(document.getElementById("root")!).render(
        <React.StrictMode>
            <div data-vscode-context='{"webviewSection": "main", "preventDefaultContextMenuItems": true}'>
                <App flowId={flowId} />
            </div>
        </React.StrictMode>,
    );
};

startApp();
