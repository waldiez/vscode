/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2024 - 2025 Waldiez & contributors
 */
import { useCallback } from "react";

import {
    WaldiezActiveRequest,
    WaldiezChatConfig,
    WaldiezChatMessage,
    WaldiezProps,
    importFlow,
    showSnackbar,
} from "@waldiez/react";

import type { ContentUpdate, HostMessage, Initialization } from "../../types";
import { messaging } from "../messaging";

export const useHostMessages = (
    sessionData: WaldiezProps,
    chatConfig: WaldiezChatConfig,
    setChatConfig: React.Dispatch<React.SetStateAction<WaldiezChatConfig>>,
    setSessionData: React.Dispatch<React.SetStateAction<WaldiezProps>>,
    setInitialized: React.Dispatch<React.SetStateAction<boolean>>,
) => {
    const initialize = useCallback(
        (hostMsg: Initialization | ContentUpdate) => {
            setInitialized(true);
            const flowData = typeof hostMsg.value === "string" ? hostMsg.value : hostMsg.value.flow;
            const monacoVsPath = undefined;

            try {
                const parsed = JSON.parse(flowData);
                const imported = importFlow(parsed);
                setSessionData({
                    ...imported,
                    monacoVsPath,
                    flowId: imported.flowId,
                    storageId: imported.storageId,
                    viewport: imported.viewport ?? { zoom: 1, x: 0, y: 0 },
                });
            } catch (e) {
                console.error("Error parsing JSON", e);
            }
        },
        [setInitialized, setSessionData],
    );

    const onInputRequest = useCallback(
        (msg: WaldiezActiveRequest) => {
            const { prompt, request_id, password } = msg;
            if (!prompt || !request_id) {
                console.error("Invalid input request:", msg);
                return;
            }
            if (chatConfig.activeRequest && chatConfig.activeRequest.request_id === request_id) {
                console.warn("Already processing this request:", request_id);
                return;
            }
            setChatConfig(prev => ({
                ...prev,
                activeRequest: { request_id, prompt, password },
                showUI: true,
            }));
        },
        [chatConfig.activeRequest, setChatConfig],
    );

    const handleMessagesUpdate = useCallback(
        (messages: WaldiezChatMessage[]) => {
            const existingIds = new Set(chatConfig.messages.map(m => m.id));
            const newMessages = messages.filter(m => !existingIds.has(m.id));
            if (newMessages.length > 0) {
                const mergedMessages = Array.from(
                    new Map([...chatConfig.messages, ...newMessages].map(m => [m.id, m])).values(),
                );
                setChatConfig(prev => ({
                    ...prev,
                    messages: mergedMessages,
                }));
            }
        },
        [chatConfig.messages, setChatConfig],
    );

    const handleParticipantsUpdate = useCallback(
        (participants: string[]) => {
            console.debug("Updating participants in chat config", participants);
            const current = chatConfig.userParticipants;
            if (JSON.stringify(current) !== JSON.stringify(participants)) {
                setChatConfig(prev => ({
                    ...prev,
                    userParticipants: participants,
                }));
            }
        },
        [chatConfig.userParticipants, setChatConfig],
    );

    const handleWorkflowEnd = useCallback(() => {
        setChatConfig(prev => ({
            ...prev,
            showUI: false,
            activeRequest: undefined,
            handlers: {
                ...prev.handlers,
                onInterrupt: undefined, // Clear interrupt handler
            },
        }));
    }, [setChatConfig]);

    const handleResolved = useCallback(() => {
        messaging.send({
            action: "ready",
        });
    }, []);

    const handleSaveResult = useCallback(
        (value: { success: boolean; message?: string }) => {
            if (!value.success) {
                showSnackbar({
                    flowId: sessionData.flowId,
                    message: `Error saving file: ${value.message}`,
                    level: "error",
                    details: value.message,
                    duration: 5000,
                    withCloseButton: true,
                });
            } else {
                showSnackbar({
                    flowId: sessionData.flowId,
                    message: "File saved successfully!",
                    level: "success",
                    duration: 2000,
                    withCloseButton: true,
                });
            }
        },
        [sessionData.flowId],
    );

    const onConverResponse = useCallback(
        (response: { success: boolean; message?: string; content?: string }) => {
            if (!response.success) {
                showSnackbar({
                    flowId: sessionData.flowId,
                    message: `Error converting flow: ${response.message}`,
                    level: "error",
                    details: response.message,
                    withCloseButton: true,
                });
            } else {
                showSnackbar({
                    flowId: sessionData.flowId,
                    message: "Flow converted successfully!",
                    level: "success",
                    withCloseButton: true,
                });
            }
        },
        [sessionData.flowId],
    );

    const createMessageHandler = useCallback(
        () => (msg: HostMessage) => {
            console.debug("Received message from host:", msg);
            switch (msg.type) {
                case "init":
                    initialize(msg);
                    messaging.send({ action: "initialized" });
                    break;
                case "input_request":
                    onInputRequest(msg.value);
                    break;
                case "messages_update":
                    handleMessagesUpdate(msg.value);
                    break;
                case "participants_update":
                    handleParticipantsUpdate(msg.value);
                    break;
                case "dispose":
                    setInitialized(false);
                    break;
                case "workflow_end":
                    handleWorkflowEnd();
                    break;
                case "resolved":
                    handleResolved();
                    break;
                case "save_result":
                    handleSaveResult(msg.value);
                    break;
                case "export":
                    onConverResponse(msg.value);
                    break;
                default:
                    break;
            }
        },
        [
            initialize,
            onInputRequest,
            handleMessagesUpdate,
            handleParticipantsUpdate,
            handleWorkflowEnd,
            handleResolved,
            handleSaveResult,
            onConverResponse,
            setInitialized,
        ],
    );

    return {
        createMessageHandler,
    };
};
