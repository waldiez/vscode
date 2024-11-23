import { App } from './App';
import './index.css';
import '@waldiez/react/dist/style.css';
import React from 'react';
import ReactDOM from 'react-dom/client';

export const startApp = () => {
    ReactDOM.createRoot(document.getElementById('root')!).render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
};

startApp();
