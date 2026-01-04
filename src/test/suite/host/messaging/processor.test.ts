/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2024 - 2026 Waldiez & contributors
 */
/* eslint-disable max-lines */
import * as assert from "assert";
import { afterEach, before, beforeEach, suite, test } from "mocha";
import * as sinon from "sinon";
import { Writable } from "stream";
import * as vscode from "vscode";

import { WaldiezChatParticipant, WaldiezTimelineData } from "@waldiez/react";

import packageJSON from "../../../../../package.json";
import { WaldiezUserInput } from "../../../../types";

const extensionId = `${packageJSON.publisher}.${packageJSON.name}`;

// Concrete implementation of MessageProcessor for testing
class TestMessageProcessor {
    public handledLines: string[] = [];
    protected _requestId?: string;
    protected _stdin: Writable | undefined | null;
    protected readonly _uploadsRoot: vscode.Uri;
    protected readonly _transport: any;
    protected readonly _runMode: "chat" | "step";

    constructor(transport: any, uploadsRoot: vscode.Uri, runMode: "chat" | "step") {
        this._transport = transport;
        this._uploadsRoot = uploadsRoot;
        this._runMode = runMode;
    }

    protected handleLine(text: string): void {
        this.handledLines.push(text);
    }

    // Copy methods from MessageProcessor for testing
    public handleJson(obj: any) {
        this.handleLine(JSON.stringify(obj));
    }

    public handleText(text: string) {
        if (text.includes("<Waldiez> - Workflow finished")) {
            return;
        }
        this.handleLine(text);
    }

    public handleInputResponse(userInput: WaldiezUserInput | undefined, isControl: boolean) {
        if (!userInput || userInput.request_id !== this._requestId) {
            return;
        }
        const data = this._extractUserResponseContent(userInput.data);
        const obj = {
            type: isControl && this._runMode === "step" ? "debug_input_response" : "input_response",
            request_id: userInput.request_id,
            data,
        };
        this._stdin?.write(JSON.stringify(obj) + "\n");
    }

    protected askForInput(requestId: string, prompt: string, password: boolean) {
        this._transport
            .askForInput({
                request_id: requestId,
                prompt,
                password,
                runMode: this._runMode,
            })
            .then((response: WaldiezUserInput | undefined) => {
                if (!response) {
                    this._stdin?.write("\n");
                    return;
                }
                this.handleInputResponse(response, false);
            })
            .catch((_err: any) => {
                this._stdin?.write("\n");
            });
    }

    public set stdin(stream: Writable | undefined | null) {
        this._stdin = stream;
    }

    public get transporter() {
        return this._transport;
    }

    protected _onTimelineUpdate(timeline: WaldiezTimelineData): void {
        this._transport.updateTimeline(timeline, this._runMode);
    }

    protected _onParticipantsUpdate(participants: WaldiezChatParticipant[]): void {
        if (this._runMode === "chat") {
            this._transport.updateParticipants(
                participants.filter(participant => participant.isUser),
                this._runMode,
            );
            return;
        }
        this._transport.updateParticipants(participants, this._runMode);
    }

    private _extractUserResponseContent = (data: any): any => {
        if (typeof data === "string") {
            try {
                return this._extractUserResponseContent(JSON.parse(data));
            } catch {
                return data;
            }
        }

        if (Array.isArray(data)) {
            if (data.length === 1 && data[0]?.content) {
                return data[0].content;
            }
            return data.map(item => {
                if (typeof item === "string") {
                    try {
                        return JSON.parse(item);
                    } catch {
                        return item;
                    }
                }
                return item;
            });
        }

        if (typeof data === "object" && data !== null) {
            if ("content" in data) {
                return data.content;
            }
            return data;
        }

        return data;
    };

    // Public method to test askForInput
    public testAskForInput(requestId: string, prompt: string, password: boolean) {
        this.askForInput(requestId, prompt, password);
    }

    // Public method to test timeline update
    public testTimelineUpdate(timeline: WaldiezTimelineData) {
        this._onTimelineUpdate(timeline);
    }

    // Public method to test participants update
    public testParticipantsUpdate(participants: WaldiezChatParticipant[]) {
        this._onParticipantsUpdate(participants);
    }

    // Public method to set request ID for testing
    public setRequestId(requestId: string) {
        this._requestId = requestId;
    }
}

// eslint-disable-next-line max-lines-per-function
suite("MessageProcessor Tests", () => {
    let sandbox: sinon.SinonSandbox;

    before(async () => {
        const ext = vscode.extensions.getExtension(extensionId);
        if (!ext) {
            throw new Error(`Extension ${extensionId} not found`);
        }
        await ext.activate();
        await new Promise(resolve => setTimeout(resolve, 500));
    });

    beforeEach(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
    });

    suite("Basic functionality", () => {
        test("should handle JSON input", () => {
            const mockTransport = {};
            const mockUploadsRoot = vscode.Uri.parse("file:///test/uploads");
            const processor = new TestMessageProcessor(mockTransport, mockUploadsRoot, "chat");

            const testObj = { type: "test", data: "sample" };
            processor.handleJson(testObj);

            assert.strictEqual(processor.handledLines.length, 1);
            assert.strictEqual(processor.handledLines[0], JSON.stringify(testObj));
        });

        test("should handle regular text input", () => {
            const mockTransport = {};
            const mockUploadsRoot = vscode.Uri.parse("file:///test/uploads");
            const processor = new TestMessageProcessor(mockTransport, mockUploadsRoot, "chat");

            const testText = "regular text message";
            processor.handleText(testText);

            assert.strictEqual(processor.handledLines.length, 1);
            assert.strictEqual(processor.handledLines[0], testText);
        });

        test("should ignore workflow finished messages", () => {
            const mockTransport = {};
            const mockUploadsRoot = vscode.Uri.parse("file:///test/uploads");
            const processor = new TestMessageProcessor(mockTransport, mockUploadsRoot, "chat");

            processor.handleText("<Waldiez> - Workflow finished");

            assert.strictEqual(processor.handledLines.length, 0);
        });

        test("should set and get stdin", () => {
            const mockTransport = {};
            const mockUploadsRoot = vscode.Uri.parse("file:///test/uploads");
            const processor = new TestMessageProcessor(mockTransport, mockUploadsRoot, "chat");

            const mockStdin = new Writable();
            processor.stdin = mockStdin;

            assert.strictEqual((processor as any)._stdin, mockStdin);
        });

        test("should get transporter", () => {
            const mockTransport = { test: "transport" };
            const mockUploadsRoot = vscode.Uri.parse("file:///test/uploads");
            const processor = new TestMessageProcessor(mockTransport, mockUploadsRoot, "chat");

            assert.strictEqual(processor.transporter, mockTransport);
        });
    });

    suite("Input handling", () => {
        test("should handle input response with matching request ID", () => {
            const mockTransport = {};
            const mockUploadsRoot = vscode.Uri.parse("file:///test/uploads");
            const processor = new TestMessageProcessor(mockTransport, mockUploadsRoot, "chat");

            const mockStdin = { write: sandbox.stub() };
            processor.stdin = mockStdin as any;
            processor.setRequestId("req123");

            const userInput: WaldiezUserInput = {
                request_id: "req123",
                data: "test response",
                type: "input_response",
            };

            processor.handleInputResponse(userInput, false);

            sinon.assert.calledOnce(mockStdin.write);
            const writtenData = mockStdin.write.getCall(0).args[0];
            const parsedData = JSON.parse(writtenData.replace("\n", ""));
            assert.strictEqual(parsedData.type, "input_response");
            assert.strictEqual(parsedData.request_id, "req123");
            assert.strictEqual(parsedData.data, "test response");
        });

        test("should handle debug input response in step mode with control flag", () => {
            const mockTransport = {};
            const mockUploadsRoot = vscode.Uri.parse("file:///test/uploads");
            const processor = new TestMessageProcessor(mockTransport, mockUploadsRoot, "step");

            const mockStdin = { write: sandbox.stub() };
            processor.stdin = mockStdin as any;
            processor.setRequestId("req123");

            const userInput: WaldiezUserInput = {
                request_id: "req123",
                data: "test response",
                type: "debug_input_response",
            };

            processor.handleInputResponse(userInput, true);

            sinon.assert.calledOnce(mockStdin.write);
            const writtenData = mockStdin.write.getCall(0).args[0];
            const parsedData = JSON.parse(writtenData.replace("\n", ""));
            assert.strictEqual(parsedData.type, "debug_input_response");
        });

        test("should ignore input response with mismatched request ID", () => {
            const mockTransport = {};
            const mockUploadsRoot = vscode.Uri.parse("file:///test/uploads");
            const processor = new TestMessageProcessor(mockTransport, mockUploadsRoot, "chat");

            const mockStdin = { write: sandbox.stub() };
            processor.stdin = mockStdin as any;
            processor.setRequestId("req123");

            const userInput: WaldiezUserInput = {
                request_id: "different_id",
                data: "test response",
                type: "input_response",
            };

            processor.handleInputResponse(userInput, false);

            sinon.assert.notCalled(mockStdin.write);
        });

        test("should ignore undefined input response", () => {
            const mockTransport = {};
            const mockUploadsRoot = vscode.Uri.parse("file:///test/uploads");
            const processor = new TestMessageProcessor(mockTransport, mockUploadsRoot, "chat");

            const mockStdin = { write: sandbox.stub() };
            processor.stdin = mockStdin as any;

            processor.handleInputResponse(undefined, false);

            sinon.assert.notCalled(mockStdin.write);
        });

        test("should ask for input and handle response", async () => {
            const mockTransport = {
                askForInput: sandbox.stub().resolves({
                    request_id: "req123",
                    data: "user response",
                }),
            };
            const mockUploadsRoot = vscode.Uri.parse("file:///test/uploads");
            const processor = new TestMessageProcessor(mockTransport, mockUploadsRoot, "chat");

            const mockStdin = { write: sandbox.stub() };
            processor.stdin = mockStdin as any;

            processor.testAskForInput("req123", "Enter value:", false);
            processor.setRequestId("req123");

            // Wait for promise to resolve
            await new Promise(resolve => setTimeout(resolve, 10));

            sinon.assert.calledOnce(mockTransport.askForInput);
            sinon.assert.calledWith(mockTransport.askForInput, {
                request_id: "req123",
                prompt: "Enter value:",
                password: false,
                runMode: "chat",
            });
        });

        test("should handle askForInput with no response", async () => {
            const mockTransport = {
                askForInput: sandbox.stub().resolves(undefined),
            };
            const mockUploadsRoot = vscode.Uri.parse("file:///test/uploads");
            const processor = new TestMessageProcessor(mockTransport, mockUploadsRoot, "chat");

            const mockStdin = { write: sandbox.stub() };
            processor.stdin = mockStdin as any;

            processor.testAskForInput("req123", "Enter value:", false);

            // Wait for promise to resolve
            await new Promise(resolve => setTimeout(resolve, 10));

            sinon.assert.calledOnce(mockStdin.write);
            sinon.assert.calledWith(mockStdin.write, "\n");
        });

        test("should handle askForInput error", async () => {
            const mockTransport = {
                askForInput: sandbox.stub().rejects(new Error("Input error")),
            };
            const mockUploadsRoot = vscode.Uri.parse("file:///test/uploads");
            const processor = new TestMessageProcessor(mockTransport, mockUploadsRoot, "chat");

            const mockStdin = { write: sandbox.stub() };
            processor.stdin = mockStdin as any;

            processor.testAskForInput("req123", "Enter value:", false);

            // Wait for promise to reject
            await new Promise(resolve => setTimeout(resolve, 10));

            sinon.assert.calledOnce(mockStdin.write);
            sinon.assert.calledWith(mockStdin.write, "\n");
        });
    });

    suite("Timeline and participants updates", () => {
        test("should update timeline", () => {
            const mockTransport = {
                updateTimeline: sandbox.stub(),
            };
            const mockUploadsRoot = vscode.Uri.parse("file:///test/uploads");
            const processor = new TestMessageProcessor(mockTransport, mockUploadsRoot, "chat");

            const timeline: WaldiezTimelineData = {
                summary: {
                    total_sessions: 1,
                    total_time: 2,
                    total_cost: 3,
                    total_agents: 4,
                    total_events: 5,
                    total_tokens: 5,
                    avg_cost_per_session: 6,
                    compression_info: {
                        gaps_compressed: 7,
                        time_saved: 7,
                    },
                },
                cost_timeline: [],
                timeline: [],
                agents: [],
                metadata: {
                    time_range: [1, 2],
                    cost_range: [3, 4],
                },
            };
            processor.testTimelineUpdate(timeline);

            sinon.assert.calledOnce(mockTransport.updateTimeline);
            sinon.assert.calledWith(mockTransport.updateTimeline, timeline, "chat");
        });

        test("should update participants in chat mode (users only)", () => {
            const mockTransport = {
                updateParticipants: sandbox.stub(),
            };
            const mockUploadsRoot = vscode.Uri.parse("file:///test/uploads");
            const processor = new TestMessageProcessor(mockTransport, mockUploadsRoot, "chat");

            const participants: WaldiezChatParticipant[] = [
                { name: "user1", isUser: true } as WaldiezChatParticipant,
                { name: "agent1", isUser: false } as WaldiezChatParticipant,
                { name: "user2", isUser: true } as WaldiezChatParticipant,
            ];

            processor.testParticipantsUpdate(participants);

            sinon.assert.calledOnce(mockTransport.updateParticipants);
            const calledParticipants = mockTransport.updateParticipants.getCall(0).args[0];
            assert.strictEqual(calledParticipants.length, 2); // Only users
            assert.strictEqual(calledParticipants[0].name, "user1");
            assert.strictEqual(calledParticipants[1].name, "user2");
        });

        test("should update participants in step mode (all participants)", () => {
            const mockTransport = {
                updateParticipants: sandbox.stub(),
            };
            const mockUploadsRoot = vscode.Uri.parse("file:///test/uploads");
            const processor = new TestMessageProcessor(mockTransport, mockUploadsRoot, "step");

            const participants: WaldiezChatParticipant[] = [
                { name: "user1", isUser: true } as WaldiezChatParticipant,
                { name: "agent1", isUser: false } as WaldiezChatParticipant,
                { name: "user2", isUser: true } as WaldiezChatParticipant,
            ];

            processor.testParticipantsUpdate(participants);

            sinon.assert.calledOnce(mockTransport.updateParticipants);
            const calledParticipants = mockTransport.updateParticipants.getCall(0).args[0];
            assert.strictEqual(calledParticipants.length, 3); // All participants
        });
    });

    suite("User response content extraction", () => {
        test("should extract string content", () => {
            const mockTransport = {};
            const mockUploadsRoot = vscode.Uri.parse("file:///test/uploads");
            const processor = new TestMessageProcessor(mockTransport, mockUploadsRoot, "chat");

            const result = (processor as any)._extractUserResponseContent("simple string");
            assert.strictEqual(result, "simple string");
        });

        test("should extract content from object with content property", () => {
            const mockTransport = {};
            const mockUploadsRoot = vscode.Uri.parse("file:///test/uploads");
            const processor = new TestMessageProcessor(mockTransport, mockUploadsRoot, "chat");

            const objectData = { content: "object content", other: "data" };
            const result = (processor as any)._extractUserResponseContent(objectData);
            assert.strictEqual(result, "object content");
        });

        test("should return object without content property as-is", () => {
            const mockTransport = {};
            const mockUploadsRoot = vscode.Uri.parse("file:///test/uploads");
            const processor = new TestMessageProcessor(mockTransport, mockUploadsRoot, "chat");

            const objectData = { other: "data", value: 42 };
            const result = (processor as any)._extractUserResponseContent(objectData);
            assert.deepStrictEqual(result, objectData);
        });

        test("should parse JSON string and extract content", () => {
            const mockTransport = {};
            const mockUploadsRoot = vscode.Uri.parse("file:///test/uploads");
            const processor = new TestMessageProcessor(mockTransport, mockUploadsRoot, "chat");

            const jsonString = '{"content": "parsed content"}';
            const result = (processor as any)._extractUserResponseContent(jsonString);
            assert.strictEqual(result, "parsed content");
        });

        test("should return invalid JSON string as-is", () => {
            const mockTransport = {};
            const mockUploadsRoot = vscode.Uri.parse("file:///test/uploads");
            const processor = new TestMessageProcessor(mockTransport, mockUploadsRoot, "chat");

            const invalidJson = "not valid json";
            const result = (processor as any)._extractUserResponseContent(invalidJson);
            assert.strictEqual(result, "not valid json");
        });

        test("should handle single-item array with content", () => {
            const mockTransport = {};
            const mockUploadsRoot = vscode.Uri.parse("file:///test/uploads");
            const processor = new TestMessageProcessor(mockTransport, mockUploadsRoot, "chat");

            const arrayData = [{ content: "array content" }];
            const result = (processor as any)._extractUserResponseContent(arrayData);
            assert.strictEqual(result, "array content");
        });

        test("should handle multi-item array", () => {
            const mockTransport = {};
            const mockUploadsRoot = vscode.Uri.parse("file:///test/uploads");
            const processor = new TestMessageProcessor(mockTransport, mockUploadsRoot, "chat");

            const arrayData = ["item1", "item2", "item3"];
            const result = (processor as any)._extractUserResponseContent(arrayData);
            assert.deepStrictEqual(result, ["item1", "item2", "item3"]);
        });

        test("should handle array with JSON strings", () => {
            const mockTransport = {};
            const mockUploadsRoot = vscode.Uri.parse("file:///test/uploads");
            const processor = new TestMessageProcessor(mockTransport, mockUploadsRoot, "chat");

            const arrayData = ['{"key": "value1"}', '{"key": "value2"}'];
            const result = (processor as any)._extractUserResponseContent(arrayData);
            assert.deepStrictEqual(result, [{ key: "value1" }, { key: "value2" }]);
        });

        test("should handle array with invalid JSON strings", () => {
            const mockTransport = {};
            const mockUploadsRoot = vscode.Uri.parse("file:///test/uploads");
            const processor = new TestMessageProcessor(mockTransport, mockUploadsRoot, "chat");

            const arrayData = ["valid string", "another valid"];
            const result = (processor as any)._extractUserResponseContent(arrayData);
            assert.deepStrictEqual(result, ["valid string", "another valid"]);
        });

        test("should handle null data", () => {
            const mockTransport = {};
            const mockUploadsRoot = vscode.Uri.parse("file:///test/uploads");
            const processor = new TestMessageProcessor(mockTransport, mockUploadsRoot, "chat");

            const result = (processor as any)._extractUserResponseContent(null);
            assert.strictEqual(result, null);
        });

        test("should handle undefined data", () => {
            const mockTransport = {};
            const mockUploadsRoot = vscode.Uri.parse("file:///test/uploads");
            const processor = new TestMessageProcessor(mockTransport, mockUploadsRoot, "chat");

            const result = (processor as any)._extractUserResponseContent(undefined);
            assert.strictEqual(result, undefined);
        });

        test("should handle number data", () => {
            const mockTransport = {};
            const mockUploadsRoot = vscode.Uri.parse("file:///test/uploads");
            const processor = new TestMessageProcessor(mockTransport, mockUploadsRoot, "chat");

            const result = (processor as any)._extractUserResponseContent(42);
            assert.strictEqual(result, 42);
        });
    });
});
