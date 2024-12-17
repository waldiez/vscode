import type {
    ContentUpdate,
    HostMessage,
    Initialization,
    InputRequest
} from '../types';
import { messaging } from './messaging';
import { transferFiles } from './uploading';
import { importFlow } from '@waldiez/react';
import { Edge, Node, Viewport } from '@xyflow/react';
import { useEffect, useState } from 'react';

export const useWaldiezWebview = () => {
    const [initialized, setInitialized] = useState(false);
    const [inputPrompt, setInputPrompt] = useState<{
        previousMessages: string[];
        prompt: string;
    } | null>(null);
    const [sessionData, setSessionData] = useState<{
        vsPath: string | null;
        inputPrompt?: {
            previousMessages: string[];
            prompt: string;
        } | null;
        flowId: string | undefined;
        nodes: Node[];
        edges: Edge[];
        viewport: Viewport;
        name: string;
        description: string;
        tags: string[];
        requirements: string[];
        storageId?: string;
        createdAt?: string;
        updatedAt?: string;
    }>({
        vsPath: null,
        inputPrompt: null,
        flowId: undefined,
        nodes: [],
        edges: [],
        viewport: {
            zoom: 1,
            x: 0,
            y: 0
        },
        name: '',
        description: '',
        tags: [],
        requirements: []
    });
    const _initialize = (hostMsg: Initialization | ContentUpdate) => {
        setInitialized(true);
        const flowData =
            typeof hostMsg.value === 'string'
                ? hostMsg.value
                : hostMsg.value.flow;
        const vsPath =
            typeof hostMsg.value === 'string'
                ? null
                : (hostMsg.value.monaco ?? sessionData.vsPath);
        try {
            const parsedData = JSON.parse(flowData);
            const importedData = importFlow(parsedData);
            setSessionData({
                ...importedData,
                vsPath,
                flowId: importedData.flowId,
                viewport: importedData.viewport ?? {
                    zoom: 1,
                    x: 0,
                    y: 0
                }
            });
        } catch (e) {
            console.error('Error parsing JSON', e);
        }
    };
    const onRun = (flowJson: string) => {
        messaging.send({
            action: 'run',
            value: flowJson
        });
    };
    const onInputRequest = (msg: InputRequest) => {
        setInputPrompt(msg.value);
    };
    const onUserInput = (value: string) => {
        messaging.send({
            action: 'input',
            value
        });
        setInputPrompt(null);
    };
    const onChange = (flowJson: string) => {
        messaging.send({
            action: 'change',
            value: flowJson
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
            (target.tagName === 'TEXTAREA' ||
                (target.tagName === 'INPUT' &&
                    ['text', 'number'].includes(
                        target.getAttribute('type') ?? ''
                    )))
        ) {
            target.setAttribute(
                'data-vscode-context',
                JSON.stringify({ preventDefaultContextMenuItems: false })
            );
        }
    };
    const messageHandler = (msg: HostMessage) => {
        switch (msg.type) {
            case 'init':
                if (!initialized) {
                    _initialize(msg);
                }
                break;
            case 'input':
                onInputRequest(msg);
                break;
            default:
                break;
        }
    };
    useEffect(() => {
        messaging.send({
            action: 'ready'
        });
        messaging.setMessageHandler(messageHandler);
        messaging.listen();
        document.addEventListener('focusin', checkFocus);
        return () => {
            messaging.stopListening();
            document.removeEventListener('focusin', checkFocus);
        };
    }, []);
    return {
        initialized,
        sessionData,
        inputPrompt,
        onRun,
        onUserInput,
        onChange,
        onUpload
    };
};
