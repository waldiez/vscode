/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2024 - 2025 Waldiez & contributors
 */
import { useCallback } from "react";

import { WaldiezProps, showSnackbar } from "@waldiez/react";

export const useHostActions = (sessionData: WaldiezProps) => {
    const onSave = useCallback(
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

    const onConvert = useCallback(
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
    return {
        onConvert,
        onSave,
    };
};
