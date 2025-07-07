/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2024 - 2025 Waldiez & contributors
 */
import {
    WaldiezActiveRequest,
    WaldiezChatMessage,
    WaldiezChatUserInput,
    WaldiezTimelineData,
} from "@waldiez/react";

// Host messages
// These messages are sent from the host (VS Code extension) to the webview
export type Resolved = {
    type: "resolved";
    value: {
        path: string;
    };
};

export type Initialization = {
    type: "init";
    value: {
        monaco: string;
        flow: string;
    };
};
export type ContentUpdate = {
    type: "update";
    value: string;
};
export type SaveResult = {
    type: "save_result";
    value: {
        success: boolean;
        message?: string;
    };
};
export type FlowOutput = {
    type: "output";
    value: any;
};
export type InputRequest = {
    type: "input_request";
    value: WaldiezActiveRequest;
};
export type UploadResponse = {
    type: "upload";
    value: any;
};
export type ExportResponse = {
    type: "export";
    value: {
        success: boolean;
        message?: string;
        path?: string;
    };
};
export type ParticipantsUpdate = {
    type: "participants_update";
    value: string[];
};
export type TimelineUpdate = {
    type: "timeline_update";
    value: WaldiezTimelineData | undefined;
};
export type MessagesUpdate = {
    type: "messages_update";
    value: WaldiezChatMessage[];
};

export type WorkflowEnd = {
    type: "workflow_end";
    value: {
        success: boolean;
        message?: string;
    };
};

export type Dispose = {
    type: "dispose";
};

export type HostMessage =
    | Initialization
    | Resolved
    | ContentUpdate
    | FlowOutput
    | UploadResponse
    | InputRequest
    | ExportResponse
    | ParticipantsUpdate
    | TimelineUpdate
    | MessagesUpdate
    | WorkflowEnd
    | SaveResult
    | Dispose;

// Webview messages
// These messages are sent from the webview to the host (VS Code extension)
export type ViewReady = {
    action: "ready";
};
export type Initialized = {
    action: "initialized";
};
export type ContentChange = {
    action: "change";
    value: string;
};

export type UploadRequest = {
    action: "upload";
    value: any;
};

export type RunRequest = {
    action: "run";
    value: any;
};

export type InputResponse = {
    action: "input_response";
    value: WaldiezChatUserInput;
};

export type StopRequest = {
    action: "stop_request";
};

export type SaveRequest = {
    action: "save";
    value: string;
};

export type ConvertRequest = {
    action: "convert";
    value: {
        flow: string;
        to: "py" | "ipynb";
    };
};

export type WebviewMessage =
    | ViewReady
    | Initialized
    | ContentChange
    | UploadRequest
    | RunRequest
    | InputResponse
    | StopRequest
    | SaveRequest
    | ConvertRequest;
