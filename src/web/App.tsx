import { useWaldiezWebview } from './hook';
import { messaging } from './messaging';
import { Waldiez } from '@waldiez/react';

export const App = () => {
    const { initialized, sessionData } = useWaldiezWebview();
    const vsPath = sessionData.vsPath;
    const flowId = sessionData.id;
    const storageId = sessionData.storageId ?? flowId;
    const onRun = (flowJson: string) => {
        messaging.send({
            action: 'run',
            value: flowJson
        });
    };
    const onUserInput = (input: string) => {
        console.info('<Waldiez> TODO: handle user input:', input);
    };
    const onChange = (flowJson: string) => {
        messaging.send({
            action: 'change',
            value: flowJson
        });
    };
    const onUpload = (files: File[]) => {
        console.info('<Waldiez> TODO: handle files upload:', files);
        return new Promise<string[]>(resolve => {
            setTimeout(() => {
                resolve(files.map(file => file.name));
            }, 1000);
        });
    };
    const {
        nodes,
        edges,
        viewport,
        name,
        description,
        tags,
        requirements,
        inputPrompt
    } = sessionData;
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
            onRun={onRun}
            onChange={onChange}
            onUpload={onUpload}
        />
    ) : (
        <div className="loading">Loading...</div>
    );
};
