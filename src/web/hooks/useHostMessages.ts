/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2024 - 2025 Waldiez & contributors
 */
import React, { useCallback } from "react";

import {
    WaldiezActiveRequest,
    WaldiezChatConfig,
    WaldiezChatMessage,
    WaldiezChatParticipant,
    WaldiezProps,
    WaldiezStepByStep,
    WaldiezTimelineData,
    importFlow,
} from "@waldiez/react";

import type { ContentUpdate, HostMessage, Initialization, RunMode } from "../../types";
import { messaging } from "../messaging";
import { useHostActions } from "./useHostActions";

export const useHostMessages = (props: {
    sessionData: WaldiezProps;
    chatConfig: WaldiezChatConfig;
    stepByStep: WaldiezStepByStep;
    setChatConfig: React.Dispatch<React.SetStateAction<WaldiezChatConfig>>;
    setStepByStep: React.Dispatch<React.SetStateAction<WaldiezStepByStep>>;
    setSessionData: React.Dispatch<React.SetStateAction<WaldiezProps>>;
    setInitialized: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
    const { sessionData, chatConfig, setChatConfig, setStepByStep, setSessionData, setInitialized } = props;
    const initialize = useCallback(
        (hostMsg: Initialization | ContentUpdate) => {
            setInitialized(true);
            const flowData = typeof hostMsg.value === "string" ? hostMsg.value : hostMsg.value.flow;
            // let's use CDN for monaco editor files
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
        (participants: WaldiezChatParticipant[], runMode: RunMode) => {
            console.debug(`Updating participants in ${runMode} mode`, participants);
            if (runMode === "chat") {
                const current = chatConfig.userParticipants;
                if (JSON.stringify(current) !== JSON.stringify(participants)) {
                    setChatConfig(prev => ({
                        ...prev,
                        userParticipants: participants,
                    }));
                }
                return;
            }
            if (runMode === "step") {
                console.error("Updating step participants");
                setStepByStep(prev => ({
                    ...prev,
                    show: true,
                    active: true,
                    participants,
                }));
            }
        },
        [chatConfig.userParticipants, setChatConfig, setStepByStep],
    );

    const handleTimelineUpdate = useCallback(
        (timeline: WaldiezTimelineData | undefined, runMode: RunMode) => {
            if (runMode === "chat") {
                setChatConfig(prev => ({
                    ...prev,
                    timeline,
                }));
                return;
            }
            if (runMode === "step") {
                setStepByStep(prev => ({
                    ...prev,
                    timeline,
                }));
            }
        },
        [setChatConfig, setStepByStep],
    );

    const handleWorkflowEnd = useCallback(
        (runMode: RunMode) => {
            if (runMode === "chat") {
                setChatConfig(prev => ({
                    ...prev,
                    show: false,
                    active: false,
                    activeRequest: undefined,
                    handlers: {
                        ...prev.handlers,
                        onInterrupt: undefined, // Clear interrupt handler
                    },
                }));
                return;
            }
            if (runMode === "step") {
                setStepByStep(prev => ({
                    ...prev,
                    active: false,
                    eventHistory: [],
                    activeRequest: undefined,
                    pendingControlInput: undefined,
                    currentEvent: undefined,
                }));
            }
        },
        [setChatConfig, setStepByStep],
    );

    const handleResolved = useCallback(() => {
        messaging.send({
            action: "ready",
        });
    }, []);

    const onControlRequest = useCallback(
        (activeRequest: WaldiezActiveRequest) => {
            setStepByStep(prev => ({
                ...prev,
                show: true,
                active: true,
                activeRequest,
                pendingControlInput: undefined,
            }));
        },
        [setStepByStep],
    );

    const onStepUpdate = useCallback(
        (stepByStep: Partial<WaldiezStepByStep>) => {
            setStepByStep(prev => ({
                ...prev,
                ...stepByStep,
            }));
        },
        [setStepByStep],
    );

    const { onConvert, onSave } = useHostActions(sessionData);

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
                case "debug_input_request":
                    onControlRequest(msg.value);
                    break;
                case "step_update":
                    onStepUpdate(msg.value);
                    break;
                case "messages_update":
                    handleMessagesUpdate(msg.value);
                    break;
                case "participants_update":
                    handleParticipantsUpdate(msg.value, msg.runMode);
                    break;
                case "timeline_update":
                    handleTimelineUpdate(msg.value, msg.runMode);
                    break;
                case "dispose":
                    setInitialized(false);
                    break;
                case "workflow_end":
                    handleWorkflowEnd(msg.runMode);
                    break;
                case "resolved":
                    handleResolved();
                    break;
                case "save_result":
                    onSave(msg.value);
                    break;
                case "export":
                    onConvert(msg.value);
                    break;
                default:
                    break;
            }
        },
        [
            initialize,
            onInputRequest,
            onControlRequest,
            handleMessagesUpdate,
            handleParticipantsUpdate,
            handleTimelineUpdate,
            setInitialized,
            handleWorkflowEnd,
            handleResolved,
            onSave,
            onConvert,
            onStepUpdate,
        ],
    );

    return {
        createMessageHandler,
    };
};
