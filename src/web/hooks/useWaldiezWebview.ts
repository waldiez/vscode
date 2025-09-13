/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2024 - 2025 Waldiez & contributors
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { nanoid } from "nanoid";

import { WaldiezChatConfig, WaldiezProps, WaldiezStepByStep } from "@waldiez/react";

import { messaging } from "../messaging";
import { transferFiles } from "../uploading";
import { useHostMessages } from "./useHostMessages";

export const useWaldiezWebview = () => {
    const randomId = useRef(nanoid()).current;
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
            show: false,
            active: false,
            messages: [],
            activeRequest: undefined,
            timeline: undefined,
            userParticipants: [],
            error: undefined,
        }));
    }, []);

    const [chatConfig, setChatConfig] = useState<WaldiezChatConfig>({
        show: false,
        active: false,
        messages: [],
        userParticipants: [],
        error: undefined,
        timeline: undefined,
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
    const [stepByStep, setStepByStep] = useState<WaldiezStepByStep>({
        show: false,
        active: false,
        stepMode: true,
        autoContinue: false,
        breakpoints: [],
        eventHistory: [],
        activeRequest: null,
        timeline: undefined,
        participants: undefined,
        pendingControlInput: null,
        handlers: {
            sendControl: value => {
                let request_id = value.request_id;
                if (request_id === "<unknown>") {
                    if (stepByStep.pendingControlInput?.request_id) {
                        request_id = stepByStep.pendingControlInput.request_id;
                    } else {
                        if (stepByStep.activeRequest?.request_id) {
                            request_id = stepByStep.activeRequest.request_id;
                        }
                    }
                }
                messaging.send({
                    action: "debug_input_response",
                    value: {
                        ...value,
                        id: nanoid(),
                        type: "debug_input_response",
                        request_id,
                        timestamp: new Date().toISOString(),
                    },
                });
                setStepByStep(prev => ({ ...prev, pendingControlInput: null }));
            },
            respond: value => {
                let request_id = value.request_id;
                if (request_id === "<unknown>" && stepByStep.activeRequest) {
                    request_id = stepByStep.activeRequest.request_id;
                }
                messaging.send({
                    action: "input_response",
                    value: { ...value, request_id },
                });
                setStepByStep(prev => ({ ...prev, activeRequest: null }));
            },
            close: () => {
                setStepByStep(prev => ({
                    ...prev,
                    show: false,
                    active: false,
                    eventHistory: [],
                    activeRequest: null,
                    pendingControlInput: null,
                }));
            },
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
        stepByStep: stepByStep,
        viewport: { zoom: 1, x: 0, y: 0 },
        name: "",
        description: "",
        tags: [],
        requirements: [],
    });

    const [initialized, setInitialized] = useState(false);

    const { createMessageHandler } = useHostMessages({
        sessionData,
        chatConfig,
        stepByStep,
        setChatConfig,
        setStepByStep,
        setSessionData,
        setInitialized,
    });

    const onRun = useCallback(
        (flowJson: string) => {
            setChatConfig(prev => ({
                ...prev,
                active: true,
                show: true,
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
    const onStepRun = useCallback((flowJson: string) => {
        setChatConfig(prev => ({
            ...prev,
            messages: [],
            userParticipants: [],
            activeRequest: undefined,
            active: false,
            show: false,
        }));
        setStepByStep(prev => ({
            ...prev,
            show: true,
        }));
        messaging.send({ action: "step_run", value: flowJson });
    }, []);

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

    // message handler
    const messageHandler = useCallback(
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
            messaging.setMessageHandler(messageHandler);
            messaging.listen();

            // Add focus listener
            document.addEventListener("focusin", checkFocus);
        }

        // Send ready message (for both first load and tab switching)
        // console.log("Sending ready message...");
        messaging.send({ action: "ready" });

        // Reset disposed state
        isDisposed.current = false;
    }, [initialized, messageHandler, checkFocus]);

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
        stepByStep,
        onRun,
        onStepRun,
        onChange,
        onSave,
        onUpload,
        onConvert: onConvertRequest,
    };
};
