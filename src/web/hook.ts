import type { ContentUpdate, HostMessage, Initialization } from '../types';
import { messaging } from './messaging';
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
    // TODO: add the rest of the message handling
    useEffect(() => {
        messaging.send({
            action: 'ready'
        });
        messaging.listen((msg: HostMessage) => {
            switch (msg.type) {
                case 'init':
                    _initialize(msg);
                    break;
                // case 'update':
                //     setInitialized(false);
                //     _initialize(msg);
                //     break;
                default:
                    break;
            }
        });
    }, []);
    return { initialized, sessionData };
};
