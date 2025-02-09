import type { ContentUpdate, HostMessage, Initialization, InputRequest } from "../types";
import { messaging } from "./messaging";
import { transferFiles } from "./uploading";

import { useEffect, useState } from "react";

import { WaldiezProps, importFlow } from "@waldiez/react";

const getRandomId = () => {
    return Math.random().toString(36).substring(2, 15);
};

export const useWaldiezWebview = () => {
    const randomId = getRandomId();
    const [initialized, setInitialized] = useState(false);
    const [inputPrompt, setInputPrompt] = useState<{
        previousMessages: string[];
        prompt: string;
    } | null>(null);
    const [sessionData, setSessionData] = useState<WaldiezProps>({
        monacoVsPath: null,
        inputPrompt: null,
        flowId: randomId,
        storageId: randomId,
        cacheSeed: 41,
        isAsync: false,
        nodes: [],
        edges: [],
        viewport: {
            zoom: 1,
            x: 0,
            y: 0,
        },
        name: "",
        description: "",
        tags: [],
        requirements: [],
    });
    const _initialize = (hostMsg: Initialization | ContentUpdate) => {
        setInitialized(true);
        const flowData = typeof hostMsg.value === "string" ? hostMsg.value : hostMsg.value.flow;
        const monacoVsPath =
            typeof hostMsg.value === "string" ? null : (hostMsg.value.monaco ?? sessionData.monacoVsPath);
        try {
            const parsedData = JSON.parse(flowData);
            const importedData = importFlow(parsedData);
            setSessionData({
                ...importedData,
                monacoVsPath,
                flowId: importedData.flowId,
                storageId: importedData.storageId,
                viewport: importedData.viewport ?? {
                    zoom: 1,
                    x: 0,
                    y: 0,
                },
            });
        } catch (e) {
            console.error("Error parsing JSON", e);
        }
    };
    const onRun = (flowJson: string) => {
        messaging.send({
            action: "run",
            value: flowJson,
        });
    };
    const onInputRequest = (msg: InputRequest) => {
        setInputPrompt(msg.value);
    };
    const onUserInput = (value: string) => {
        messaging.send({
            action: "input",
            value,
        });
        setInputPrompt(null);
    };
    const onChange = (flowJson: string) => {
        messaging.send({
            action: "change",
            value: flowJson,
        });
    };
    const onUpload = (files: File[]) => {
        return new Promise<string[]>((resolve, reject) => {
            transferFiles(files).then(resolve).catch(reject);
        });
    };
    const checkFocus = (event: FocusEvent) => {
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
    };
    const messageHandler = (msg: HostMessage) => {
        switch (msg.type) {
            case "init":
                if (!initialized) {
                    _initialize(msg);
                }
                break;
            case "input":
                onInputRequest(msg);
                break;
            default:
                break;
        }
    };
    useEffect(() => {
        messaging.send({
            action: "ready",
        });
        messaging.setMessageHandler(messageHandler);
        messaging.listen();
        document.addEventListener("focusin", checkFocus);
        return () => {
            messaging.stopListening();
            document.removeEventListener("focusin", checkFocus);
        };
    }, []);
    return {
        initialized,
        sessionData,
        inputPrompt,
        onRun,
        onUserInput,
        onChange,
        onUpload,
    };
};
