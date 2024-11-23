export type InitMessage = {
    type: 'init';
    value: {
        monaco: string;
        flow: string;
    };
};
export type OutputMessage = {
    type: 'output';
    value: any;
};
export type InputMessage = {
    type: 'input';
    value: any;
};
export type UploadMessage = {
    type: 'upload';
    value: any;
};
export type ExportMessage = {
    type: 'export';
    value: any;
};
export type HostMessage =
    | InitMessage
    | OutputMessage
    | InputMessage
    | UploadMessage
    | ExportMessage;

export type ReadyMessage = {
    action: 'ready';
};
export type UpdateMessage = {
    action: 'update';
    value: string;
};
export type RunMessage = {
    action: 'run';
    value: any;
};

export type WebviewMessage = ReadyMessage | UpdateMessage | RunMessage;
