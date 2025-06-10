/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2024 - 2025 Waldiez & contributors
 */
import { Waldiez } from "@waldiez/react";

import { useWaldiezWebview } from "./hooks";

export const App = (props: { flowId: string }) => {
    const { flowId } = props;
    const { initialized, sessionData, chat, onRun, onChange, onSave, onUpload, onConvert } =
        useWaldiezWebview();
    const vsPath = sessionData.monacoVsPath;
    const storageId = sessionData.storageId ?? flowId;
    const { nodes, edges, viewport, name, description, tags, requirements, isAsync, cacheSeed } = sessionData;
    return initialized ? (
        <Waldiez
            monacoVsPath={vsPath}
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
            onChange={onChange}
            onUpload={onUpload}
            onSave={onSave}
            onConvert={onConvert}
            chat={chat}
        />
    ) : (
        <div className="loading">Loading...</div>
    );
};
