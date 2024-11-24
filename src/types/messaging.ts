export type Initialization = {
    type: 'init';
    value: {
        monaco: string;
        flow: string;
    };
};
export type ContentUpdate = {
    type: 'update';
    value: string;
};
export type FlowOutput = {
    type: 'output';
    value: any;
};
export type InputResponse = {
    type: 'input';
    value: {
        previousMessages: string[];
        prompt: string;
    };
};
export type UploadResponse = {
    type: 'upload';
    value: any;
};
export type ExportResponse = {
    type: 'export';
    value: any;
};
export type HostMessage =
    | Initialization
    | ContentUpdate
    | FlowOutput
    | InputResponse
    | UploadResponse
    | ExportResponse;

export type ViewReady = {
    action: 'ready';
};
export type ContentChange = {
    action: 'change';
    value: string;
};
export type RunRequest = {
    action: 'run';
    value: any;
};

export type InputRequest = {
    action: 'prompt';
    value: string;
};

export type WebviewMessage =
    | ViewReady
    | ContentChange
    | RunRequest
    | InputRequest;
