/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2024 - 2025 Waldiez & contributors
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { WaldiezChatConfig, WaldiezProps } from "@waldiez/react";

import { messaging } from "../messaging";
import { transferFiles } from "../uploading";
import { useHostMessages } from "./useHostMessages";
import { getRandomId } from "./utils";

export const useWaldiezWebview = () => {
    const randomId = useRef(getRandomId()).current;
    const hasInitialized = useRef(false);
    const messageHandlerRef = useRef<((message: any) => void) | null>(null);
    const isDisposed = useRef(false);

    const onInterrupt = useCallback(() => {
        setChatConfig(prev => ({
            ...prev,
            showUI: false,
            activeRequest: undefined,
        }));
        messaging.send({ action: "stop_request" });
    }, []);

    const onClose = useCallback(() => {
        setChatConfig(prev => ({
            ...prev,
            showUI: false,
            messages: [],
            activeRequest: undefined,
            userParticipants: [],
        }));
    }, []);

    const [chatConfig, setChatConfig] = useState<WaldiezChatConfig>({
        showUI: false,
        messages: [],
        userParticipants: [],
        activeRequest: undefined,
        handlers: {
            onUserInput: value => {
                messaging.send({ action: "input_response", value });
                setChatConfig(prev => ({ ...prev, activeRequest: undefined }));
            },
            onInterrupt: onInterrupt,
            onClose: onClose,
        },
    });

    const [sessionData, setSessionData] = useState<WaldiezProps>({
        monacoVsPath: undefined,
        flowId: randomId,
        storageId: randomId,
        cacheSeed: undefined,
        isAsync: false,
        nodes: [],
        edges: [],
        chat: chatConfig,
        viewport: { zoom: 1, x: 0, y: 0 },
        name: "",
        description: "",
        tags: [],
        requirements: [],
    });

    const [initialized, setInitialized] = useState(false);

    const { createMessageHandler } = useHostMessages(
        sessionData,
        chatConfig,
        setChatConfig,
        setSessionData,
        setInitialized,
    );

    const onRun = useCallback(
        (flowJson: string) => {
            setChatConfig(prev => ({
                ...prev,
                messages: [],
                userParticipants: [],
                activeRequest: undefined,
                handlers: {
                    ...prev.handlers,
                    onInterrupt,
                },
            }));
            messaging.send({ action: "run", value: flowJson });
        },
        [onInterrupt],
    );

    const onChange = useCallback(
        (flowJson: string) => messaging.send({ action: "change", value: flowJson }),
        [],
    );

    const onUpload = useCallback((files: File[]) => transferFiles(files), []);

    const onConvertRequest = useCallback((flow: string, to: "py" | "ipynb") => {
        messaging.send({ action: "convert", value: { flow, to } });
    }, []);

    const onSave = useCallback((flowJson: string) => {
        messaging.send({ action: "save", value: flowJson });
    }, []);

    const checkFocus = useCallback((event: FocusEvent) => {
        const target = event.target;
        if (
            target instanceof Element &&
            (target.tagName === "TEXTAREA" ||
                (target.tagName === "INPUT" &&
                    ["text", "number"].includes(target.getAttribute("type") ?? "")))
        ) {
            target.setAttribute(
                "data-vscode-context",
                JSON.stringify({ preventDefaultContextMenuItems: false }),
            );
        }
    }, []);

    // Handle disposal message from extension
    const handleDispose = useCallback(() => {
        console.log("Webview disposed, resetting state...");
        isDisposed.current = true;
        setInitialized(false);
        // Reset session data to initial state
        setSessionData(prev => ({
            ...prev,
            nodes: [],
            edges: [],
            viewport: { zoom: 1, x: 0, y: 0 },
        }));
    }, []);

    // Stable message handler
    const stableMessageHandler = useCallback(
        (message: any) => {
            // Handle dispose action specifically
            if (message.action === "dispose") {
                handleDispose();
                return;
            }

            if (messageHandlerRef.current) {
                messageHandlerRef.current(message);
            }
        },
        [handleDispose],
    );

    // Update the message handler ref when createMessageHandler changes
    useEffect(() => {
        messageHandlerRef.current = createMessageHandler();
    }, [createMessageHandler]);

    // Initialization effect - handles both first load and re-initialization
    useEffect(() => {
        if (hasInitialized.current && initialized) {
            return; // Already initialized and ready
        }

        if (!hasInitialized.current) {
            // console.log("First-time webview initialization...");
            hasInitialized.current = true;

            // Set up message handler and listener
            messaging.setMessageHandler(stableMessageHandler);
            messaging.listen();

            // Add focus listener
            document.addEventListener("focusin", checkFocus);
        }

        // Send ready message (for both first load and tab switching)
        // console.log("Sending ready message...");
        messaging.send({ action: "ready" });

        // Reset disposed state
        isDisposed.current = false;
    }, [initialized, stableMessageHandler, checkFocus]);

    // Cleanup effect
    useEffect(() => {
        return () => {
            // console.log("Cleaning up webview...");
            messaging.stopListening();
            document.removeEventListener("focusin", checkFocus);
        };
    }, [checkFocus]);

    // Handle visibility changes - detect when we need to re-initialize
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible" && isDisposed.current) {
                // console.log("Tab became visible after disposal, re-initializing...");
                setInitialized(false); // This will trigger re-initialization
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, []);

    return {
        initialized,
        sessionData,
        chat: chatConfig,
        onRun,
        onChange,
        onSave,
        onUpload,
        onConvert: onConvertRequest,
    };
};
