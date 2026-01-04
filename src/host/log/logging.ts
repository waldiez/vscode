/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2024 - 2026 Waldiez & contributors
 */
import * as util from "util";
import { Disposable, LogOutputChannel } from "vscode";

type Arguments = unknown[];

/**
 * A logger utility that wraps a VS Code LogOutputChannel, providing methods for various log levels.
 */
class OutputChannelLogger {
    private _visible: boolean;

    /**
     * Constructs an OutputChannelLogger instance.
     *
     * @param channel - The VS Code LogOutputChannel to use for logging.
     */
    constructor(private readonly channel: LogOutputChannel) {
        this._visible = false; // Tracks whether the log output channel is visible.
    }

    /**
     * Checks if the log output channel is currently visible.
     *
     * @returns True if the log channel is visible, false otherwise.
     */
    public isVisible(): boolean {
        return this._visible;
    }

    /**
     * Logs general information messages to the channel.
     *
     * @param data - Arguments to be logged.
     */
    public traceLog(...data: Arguments): void {
        this.channel.appendLine(util.format(...data));
    }

    /**
     * Logs error messages to the channel.
     *
     * @param data - Arguments to be logged.
     */
    public traceError(...data: Arguments): void {
        this.channel.error(util.format(...data));
    }

    /**
     * Logs warning messages to the channel.
     *
     * @param data - Arguments to be logged.
     */
    public traceWarn(...data: Arguments): void {
        this.channel.warn(util.format(...data));
    }

    /**
     * Logs informational messages to the channel.
     *
     * @param data - Arguments to be logged.
     */
    public traceInfo(...data: Arguments): void {
        this.channel.info(util.format(...data));
    }

    /**
     * Logs verbose/debug messages to the channel.
     *
     * @param data - Arguments to be logged.
     */
    public traceVerbose(...data: Arguments): void {
        this.channel.debug(util.format(...data));
    }

    /**
     * Hides the log output channel and marks it as not visible.
     */
    public hide(): void {
        this.channel.hide();
        this._visible = false;
    }

    /**
     * Shows the log output channel and marks it as visible.
     */
    public show(): void {
        this.channel.show();
        this._visible = true;
    }

    /**
     * Clears the content of the log output channel.
     */
    public clear(): void {
        this.channel.clear();
    }
}

// A singleton instance of the logger
let channel: OutputChannelLogger | undefined;

/**
 * Registers a logger using the provided LogOutputChannel.
 *
 * @param logChannel - The LogOutputChannel to wrap with the logger.
 * @returns A Disposable that cleans up the logger instance when disposed.
 */
export const registerLogger = (logChannel: LogOutputChannel): Disposable => {
    channel = new OutputChannelLogger(logChannel);
    return {
        dispose: () => {
            channel = undefined; // Clear the logger instance on disposal
        },
    };
};

/**
 * Checks if the log output channel is currently visible.
 *
 * @returns True if the log channel is visible, false otherwise.
 */
export const isOutputVisible = (): boolean => {
    return channel?.isVisible() ?? false;
};

/**
 * Shows the log output channel.
 */
export const showOutput = (): void => {
    channel?.show();
};

// noinspection JSUnusedGlobalSymbols
/**
 * Hides the log output channel.
 */
export const hideOutput = (): void => {
    channel?.hide();
};

/**
 * Clears the content of the log output channel.
 */
export const clearOutput = (): void => {
    channel?.clear();
};

/**
 * Logs general information messages.
 *
 * @param args - Arguments to be logged.
 */
export const traceLog = (...args: Arguments): void => {
    channel?.traceLog(...args);
};

/**
 * Logs error messages.
 *
 * @param args - Arguments to be logged.
 */
export const traceError = (...args: Arguments): void => {
    channel?.traceError(...args);
};

/**
 * Logs warning messages.
 *
 * @param args - Arguments to be logged.
 */
export const traceWarn = (...args: Arguments): void => {
    channel?.traceWarn(...args);
};

/**
 * Logs informational messages.
 *
 * @param args - Arguments to be logged.
 */
export const traceInfo = (...args: Arguments): void => {
    channel?.traceInfo(...args);
};

/**
 * Logs verbose/debug messages.
 *
 * @param args - Arguments to be logged.
 */
export const traceVerbose = (...args: Arguments): void => {
    channel?.traceVerbose(...args);
};
