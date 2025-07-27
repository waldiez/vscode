/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2024 - 2025 Waldiez & contributors
 */
export class ViewStateHandler {
    private currentState: boolean | null = null;
    private debounceTimeout: NodeJS.Timeout | null = null;
    private lastChangeTime: number = 0;
    private readonly STABILITY_PERIOD = 1000; // Must be stable for 1 second

    constructor(
        private onVisible: () => void,
        private onHidden: () => void,
    ) {}

    handleStateChange(visible: boolean) {
        // Record when this state change happened
        this.lastChangeTime = Date.now();

        // Clear existing timeout
        if (this.debounceTimeout) {
            clearTimeout(this.debounceTimeout);
        }

        // Wait for stability period, then check if state is still the same
        this.debounceTimeout = setTimeout(() => {
            this.checkStability(visible);
        }, this.STABILITY_PERIOD);
    }

    private checkStability(expectedState: boolean) {
        const timeSinceLastChange = Date.now() - this.lastChangeTime;

        if (timeSinceLastChange >= this.STABILITY_PERIOD) {
            // State has been stable long enough
            if (this.currentState !== expectedState) {
                this.currentState = expectedState;

                if (expectedState) {
                    this.onVisible();
                } else {
                    this.onHidden();
                }
            }
        } else {
            this.debounceTimeout = setTimeout(() => {
                this.checkStability(expectedState);
            }, this.STABILITY_PERIOD - timeSinceLastChange);
        }
    }

    dispose() {
        if (this.debounceTimeout) {
            clearTimeout(this.debounceTimeout);
        }
    }
}
