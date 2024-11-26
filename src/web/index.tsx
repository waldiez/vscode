import { App } from './App';
import './index.css';
import '@waldiez/react/dist/@waldiez.css';
import React from 'react';
import ReactDOM from 'react-dom/client';

export const startApp = () => {
    ReactDOM.createRoot(document.getElementById('root')!).render(
        <React.StrictMode>
            <div data-vscode-context='{"webviewSection": "main", "preventDefaultContextMenuItems": true}'>
                <App />
            </div>
        </React.StrictMode>
    );
};

startApp();
