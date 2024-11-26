import type { ContentUpdate, HostMessage, Initialization } from '../types';
import { messaging } from './messaging';
import { transferFiles } from './uploading';
import { importFlow } from '@waldiez/react';
import { Edge, Node, Viewport } from '@xyflow/react';
import { useEffect, useState } from 'react';

export const useWaldiezWebview = () => {
    const [initialized, setInitialized] = useState(false);
    const [sessionData, setSessionData] = useState<{
        vsPath: string | null;
        inputPrompt?: {
            previousMessages: string[];
            prompt: string;
        } | null;
        id: string | undefined;
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
        id: undefined,
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
            setSessionData({ ...importedData, vsPath });
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
    const onUserInput = (input: string) => {
        console.log('<Waldiez> TODO: handle user input:', input);
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
        // Check if the element is an input or textarea
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
                // data-vscode-context='{"preventDefaultContextMenuItems": true}'
            );
        }
    };
    // TODO: handle user input and run requests
    const messageHandler = (msg: HostMessage) => {
        switch (msg.type) {
            case 'init':
                if (!initialized) {
                    _initialize(msg);
                }
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
    return { initialized, sessionData, onRun, onUserInput, onChange, onUpload };
};
