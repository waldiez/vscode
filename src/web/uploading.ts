/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2024 - 2025 Waldiez & contributors
 */
import { messaging } from "./messaging";

export const transferFiles = async (files: File[]): Promise<string[]> => {
    const promises = [...files].map(file => {
        // noinspection TypeScriptUMDGlobal
        return new Promise(resolve => {
            const reader = new FileReader();

            reader.onload = () => {
                if (typeof reader.result !== "string") {
                    return;
                }
                const fileData = {
                    name: file.name,
                    type: file.type,
                    content: reader.result.split(",")[1], // Base64 encoded
                };

                resolve(fileData);
            };

            reader.readAsDataURL(file);
        });
    });

    const fileDataArray = await Promise.all(promises);

    messaging.send({ action: "upload", value: fileDataArray });

    // Wait for paths from the extension
    const filePaths = await waitForFilePaths(fileDataArray.length);
    // noinspection TypeScriptUMDGlobal
    return new Promise<string[]>(resolve => {
        resolve(filePaths);
    });
};

// Helper to wait for paths from the extension
const waitForFilePaths = (expectedCount: number): Promise<string[]> => {
    // noinspection TypeScriptUMDGlobal
    return new Promise<string[]>(resolve => {
        const receivedPaths: string[] = [];
        const timeout = 5000 * expectedCount; // 5 seconds per file
        const listener = (event: MessageEvent) => {
            if (event.data.type === "upload") {
                receivedPaths.push(...event.data.value);

                if (receivedPaths.length >= expectedCount) {
                    cleanup(); // Clear the timeout and remove the listener
                    resolve(receivedPaths.filter(item => item !== null)); // Filter out any null paths
                }
            }
        };

        const cleanup = () => {
            clearTimeout(timeoutId);
            window.removeEventListener("message", listener);
        };

        // Set a timeout to ensure the listener only listens for the specified duration
        const timeoutId = setTimeout(() => {
            cleanup();
            resolve(receivedPaths); // Resolve with whatever paths were received, even if incomplete
        }, timeout);

        window.addEventListener("message", listener);
    });
};
