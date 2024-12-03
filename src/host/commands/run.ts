import { FlowRunner, TIME_TO_WAIT_FOR_INPUT } from '../flow/runner';
import * as vscode from 'vscode';

export const runFlow = async (resource: vscode.Uri, runner: FlowRunner) => {
    const waitForInput = async (previousMessages: string[], prompt: string) => {
        return new Promise<string | undefined>(resolve => {
            const panel = vscode.window.createWebviewPanel(
                'waldiezFlowInput',
                'Waldiez Flow Input',
                vscode.ViewColumn.One,
                {
                    enableScripts: true
                }
            );
            setTimeout(() => {
                resolve('\n');
                panel.dispose();
            }, TIME_TO_WAIT_FOR_INPUT);
            panel.webview.html = getInputWebviewContent(
                previousMessages,
                prompt
            );
            panel.webview.onDidReceiveMessage(message => {
                if (message.command === 'submit') {
                    resolve(message.text);
                    panel.dispose();
                } else if (message.command === 'close') {
                    resolve('\n');
                    panel.dispose();
                }
            });
        });
    };
    return new Promise<void>((resolve, reject) => {
        runner
            .run(resource, waitForInput)
            .then(() => {
                resolve();
            })
            .catch(error => {
                reject(error);
            });
    });
};
function getInputWebviewContent(previousMessages: string[], prompt: string) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Waldiez Flow Input Modal</title>
        <style>
            /* Root styles matching VS Code's theme variables */
            :root {
                --background: var(--vscode-editor-background);
                --foreground: var(--vscode-editor-foreground);
                --border: var(--vscode-panel-border);
                --inputBackground: var(--vscode-input-background);
                --inputForeground: var(--vscode-input-foreground);
                --inputBorder: var(--vscode-input-border);
                --buttonBackground: var(--vscode-button-background);
                --buttonForeground: var(--vscode-button-foreground);
                --buttonHover: var(--vscode-button-hoverBackground);
            }

            body {
                font-family: var(--vscode-font-family);
                font-size: var(--vscode-font-size);
                color: var(--foreground);
                background-color: rgba(0, 0, 0, 0.6); /* Dark overlay for modal effect */
                margin: 0;
                padding: 0;
                display: flex;
                justify-content: center;
            }

            #modal-container {
                background-color: var(--background);
                color: var(--foreground);
                width: 50%;
                max-width: 100%;
                border: 1px solid var(--border);
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }

            #previous-messages {
                flex: 1;
                max-height: calc(100vh - 200px);
                overflow-y: auto;
                padding: 10px;
                border-bottom: 1px solid var(--border);
                background-color: var(--inputBackground);
                color: var(--inputForeground);
            }

            #input-container {
                display: flex;
                padding: 10px;
                gap: 10px;
                align-items: center;
            }

            input[type="text"] {
                flex: 1;
                padding: 8px;
                font-size: 14px;
                border: 1px solid var(--inputBorder);
                border-radius: 4px;
                background-color: var(--inputBackground);
                color: var(--inputForeground);
                outline: none;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            }

            input[type="text"]::placeholder {
                color: var(--inputForeground);
                opacity: 0.6;
            }

            button {
                padding: 8px 12px;
                font-size: 14px;
                border: none;
                border-radius: 4px;
                background-color: var(--buttonBackground);
                color: var(--buttonForeground);
                cursor: pointer;
                transition: background-color 0.2s ease;
            }

            button:hover {
                background-color: var(--buttonHover);
            }

            /* Optional close button */
            #modal-header {
                display: flex;
                justify-content: flex-end;
                padding: 5px;
                border-bottom: 1px solid var(--border);
            }

            #close-button {
                background: none;
                border: none;
                font-size: 16px;
                color: var(--foreground);
                cursor: pointer;
            }

            #close-button:hover {
                color: var(--buttonHover);
            }
        </style>
    </head>
    <body>
        <div id="modal-container">
            <div id="modal-header">
                <button id="close-button">✖</button>
            </div>
            <div id="previous-messages">
                ${previousMessages.map(message => `<div>${message}</div>`).join('')}
            </div>
            <div id="input-container">
                <input type="text" id="input-box" placeholder="${prompt}" />
                <button id="send-button">Send</button>
            </div>
        </div>
        <script>
            const vscode = acquireVsCodeApi();

            const inputBox = document.getElementById('input-box');
            const closeButton = document.getElementById('close-button');
            const sendButton = document.getElementById('send-button');

            // Handle submit logic
            const submitInput = () => {
                vscode.postMessage({
                    command: 'submit',
                    text: inputBox.value.trim(),
                });
                inputBox.value = ''; // Clear the input box after submission
            };

            // Handle close logic
            const closeModal = () => {
                vscode.postMessage({
                    command: 'close',
                });
            };

            // Click events
            sendButton.addEventListener('click', submitInput);
            closeButton.addEventListener('click', closeModal);

            // Listen for 'Enter' and 'Esc' keys
            document.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    submitInput();
                } else if (event.key === 'Escape') {
                    closeModal();
                }
            });
        </script>
    </body>
    </html>
`;
}
