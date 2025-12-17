/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2024 - 2025 Waldiez & contributors
 */
import { Waldiez } from "@waldiez/react";

import { useWaldiezWebview } from "./hooks";

export const App = (props: { flowId: string; monacoVsPath?: string }) => {
    const { flowId, monacoVsPath } = props;
    const {
        initialized,
        sessionData,
        chat,
        stepByStep,
        onRun,
        onStepRun,
        onSave,
        onUpload,
        onConvert,
        onGetCheckpoints,
    } = useWaldiezWebview();
    const storageId = sessionData.storageId ?? flowId;
    const { nodes, edges, viewport, name, description, tags, requirements, isAsync, cacheSeed } = sessionData;
    return initialized ? (
        <Waldiez
            monacoVsPath={monacoVsPath}
            flowId={flowId}
            storageId={storageId}
            nodes={nodes}
            edges={edges}
            viewport={viewport}
            name={name}
            description={description}
            tags={tags}
            requirements={requirements}
            isAsync={isAsync}
            cacheSeed={cacheSeed}
            onRun={onRun}
            onStepRun={onStepRun}
            onUpload={onUpload}
            onSave={onSave}
            onConvert={onConvert}
            chat={chat}
            stepByStep={stepByStep}
            checkpoints={{
                get: onGetCheckpoints,
            }}
        />
    ) : (
        <div className="loading">Loading...</div>
    );
};
