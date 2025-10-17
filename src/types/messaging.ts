/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2024 - 2025 Waldiez & contributors
 */
import {
    WaldiezActiveRequest,
    WaldiezChatMessage,
    WaldiezChatParticipant,
    WaldiezChatUserInput,
    WaldiezStepByStep,
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
export type DebugInputRequest = {
    type: "debug_input_request";
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
    value: WaldiezChatParticipant[];
    runMode: RunMode;
};
export type TimelineUpdate = {
    type: "timeline_update";
    value: WaldiezTimelineData | undefined;
    runMode: RunMode;
};
export type MessagesUpdate = {
    type: "messages_update";
    value: WaldiezChatMessage[];
};

export type StepUpdate = {
    type: "step_update";
    value: Partial<WaldiezStepByStep>;
};

export type WorkflowEnd = {
    type: "workflow_end";
    value: {
        success: boolean;
        message?: string;
    };
    runMode: RunMode;
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
    | DebugInputRequest
    | ExportResponse
    | ParticipantsUpdate
    | TimelineUpdate
    | MessagesUpdate
    | StepUpdate
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

export type StepRunRequest = {
    action: "step_run";
    value: any;
    args?: string[];
};

export type InputResponse = {
    action: "input_response";
    value: WaldiezUserInput;
};

export type DebugInputResponse = {
    action: "debug_input_response";
    value: WaldiezUserInput;
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

export type RunMode = "chat" | "step";
export type WaldiezUserInput = Omit<WaldiezChatUserInput, "type"> & {
    type: "debug_input_response" | "input_response";
};

export type WebviewMessage =
    | ViewReady
    | Initialized
    | ContentChange
    | UploadRequest
    | RunRequest
    | StepRunRequest
    | InputResponse
    | DebugInputResponse
    | StopRequest
    | SaveRequest
    | ConvertRequest;
