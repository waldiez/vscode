import { useWaldiezWebview } from "./hook";

import { Waldiez } from "@waldiez/react";

export const App = (props: { flowId: string }) => {
    const { flowId } = props;
    const { initialized, sessionData, inputPrompt, onRun, onChange, onUpload, onUserInput } =
        useWaldiezWebview();
    const vsPath = sessionData.monacoVsPath;
    const storageId = sessionData.storageId ?? flowId;
    const { nodes, edges, viewport, name, description, tags, requirements, isAsync, cacheSeed } = sessionData;
    return initialized ? (
        <Waldiez
            monacoVsPath={vsPath}
            onUserInput={onUserInput}
            flowId={flowId}
            storageId={storageId}
            inputPrompt={inputPrompt}
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
        />
    ) : (
        <div className="loading">Loading...</div>
    );
};
