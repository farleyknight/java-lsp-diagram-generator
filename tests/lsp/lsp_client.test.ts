import { LspClient } from '../../src/lsp/lsp_client';
import { LspManager } from '../../src/lsp/lsp_manager';
import {
    InitializeParams,
    InitializeResult,
    InitializedParams,
    DidOpenTextDocumentParams,
    TextDocumentPositionParams,
    Definition,
    ReferenceParams,
    Location,
    CallHierarchyPrepareParams,
    CallHierarchyItem,
    CallHierarchyIncomingCallsParams,
    CallHierarchyIncomingCall,
    CallHierarchyOutgoingCallsParams,
    CallHierarchyOutgoingCall,
    DocumentUri,
    Position,
    ClientCapabilities
} from '../../src/lsp/types';

// Mock LspManager
// Adjust the mock path based on the new file location
jest.mock('../../src/lsp/lsp_manager'); // Automatically mocks all methods

describe('LspClient', () => {
    let mockLspManager: jest.Mocked<LspManager>;
    let lspClient: LspClient;

    beforeEach(() => {
        // Create a new mock LspManager for each test
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockLspManager = new LspManager(null as any, null as any) as jest.Mocked<LspManager>; 
        jest.clearAllMocks(); 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockLspManager = new LspManager(null as any, null as any) as jest.Mocked<LspManager>; 

        lspClient = new LspClient(mockLspManager);
    });

    describe('initialize', () => {
        it('should call lspManager.sendRequest with "initialize" and correct params, returning the result', async () => {
            const params: InitializeParams = {
                processId: 123,
                rootUri: 'file:///test/project' as DocumentUri,
                capabilities: {} as ClientCapabilities,
                trace: 'off',
            };
            const expectedResult: InitializeResult = {
                capabilities: {},
            };

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            mockLspManager.sendRequest.mockResolvedValue(expectedResult as any);

            const result = await lspClient.initialize(params);

            expect(mockLspManager.sendRequest).toHaveBeenCalledWith('initialize', params);
            expect(result).toEqual(expectedResult);
        });
    });

    describe('initialized', () => {
        it('should call lspManager.sendNotification with "initialized" and correct params', () => {
            const params: InitializedParams = {}; 

            lspClient.initialized(params);

            expect(mockLspManager.sendNotification).toHaveBeenCalledWith('initialized', params);
        });
    });

    describe('shutdown', () => {
        it('should call lspManager.sendRequest with "shutdown" and null params, returning a promise that resolves', async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            mockLspManager.sendRequest.mockResolvedValue(null as any);

            await lspClient.shutdown();

            expect(mockLspManager.sendRequest).toHaveBeenCalledWith('shutdown', null);
        });
    });

    describe('exit', () => {
        it('should call lspManager.sendNotification with "exit" and null params', () => {
            lspClient.exit();

            expect(mockLspManager.sendNotification).toHaveBeenCalledWith('exit', null);
        });
    });

    describe('textDocumentDidOpen', () => {
        it('should call lspManager.sendNotification with "textDocument/didOpen" and correct params', () => {
            const params: DidOpenTextDocumentParams = {
                textDocument: {
                    uri: 'file:///test/project/doc.java' as DocumentUri,
                    languageId: 'java',
                    version: 1,
                    text: 'public class Test {}'
                }
            };

            lspClient.textDocumentDidOpen(params);

            expect(mockLspManager.sendNotification).toHaveBeenCalledWith('textDocument/didOpen', params);
        });
    });

    describe('getTextDocumentDefinition', () => {
        it('should call lspManager.sendRequest with "textDocument/definition" and correct params, returning the result', async () => {
            const params: TextDocumentPositionParams = {
                textDocument: { uri: 'file:///test/project/doc.java' as DocumentUri },
                position: { line: 0, character: 0 }
            };
            const expectedResult: Definition = {
                uri: 'file:///test/project/doc.java' as DocumentUri,
                range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } }
            };

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            mockLspManager.sendRequest.mockResolvedValue(expectedResult as any);

            const result = await lspClient.getTextDocumentDefinition(params);

            expect(mockLspManager.sendRequest).toHaveBeenCalledWith('textDocument/definition', params);
            expect(result).toEqual(expectedResult);
        });

        it('should return null if lspManager.sendRequest resolves with null', async () => {
            const params: TextDocumentPositionParams = {
                textDocument: { uri: 'file:///test/project/doc.java' as DocumentUri },
                position: { line: 0, character: 0 }
            };

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            mockLspManager.sendRequest.mockResolvedValue(null as any);

            const result = await lspClient.getTextDocumentDefinition(params);

            expect(mockLspManager.sendRequest).toHaveBeenCalledWith('textDocument/definition', params);
            expect(result).toBeNull();
        });
    });

    describe('getTextDocumentReferences', () => {
        it('should call lspManager.sendRequest with "textDocument/references" and correct params, returning the result', async () => {
            const params: ReferenceParams = {
                textDocument: { uri: 'file:///test/project/doc.java' as DocumentUri },
                position: { line: 0, character: 0 },
                context: { includeDeclaration: false }
            };
            const expectedResult: Location[] = [
                { uri: 'file:///test/project/other.java' as DocumentUri, range: { start: { line: 1, character: 5 }, end: { line: 1, character: 15 } } }
            ];

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            mockLspManager.sendRequest.mockResolvedValue(expectedResult as any);

            const result = await lspClient.getTextDocumentReferences(params);

            expect(mockLspManager.sendRequest).toHaveBeenCalledWith('textDocument/references', params);
            expect(result).toEqual(expectedResult);
        });

        it('should return null if lspManager.sendRequest resolves with null', async () => {
            const params: ReferenceParams = {
                textDocument: { uri: 'file:///test/project/doc.java' as DocumentUri },
                position: { line: 0, character: 0 },
                context: { includeDeclaration: false }
            };

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            mockLspManager.sendRequest.mockResolvedValue(null as any);

            const result = await lspClient.getTextDocumentReferences(params);

            expect(mockLspManager.sendRequest).toHaveBeenCalledWith('textDocument/references', params);
            expect(result).toBeNull();
        });
    });

    describe('prepareCallHierarchy', () => {
        it('should call lspManager.sendRequest with "callHierarchy/prepare" and correct params, returning the result', async () => {
            const params: CallHierarchyPrepareParams = {
                textDocument: { uri: 'file:///test/project/doc.java' as DocumentUri },
                position: { line: 0, character: 0 }
            };
            const expectedResult: CallHierarchyItem[] = [
                {
                    name: 'testMethod',
                    kind: 3, // SymbolKind.Method
                    uri: 'file:///test/project/doc.java' as DocumentUri,
                    range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } },
                    selectionRange: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } }
                }
            ];

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            mockLspManager.sendRequest.mockResolvedValue(expectedResult as any);

            const result = await lspClient.prepareCallHierarchy(params);

            expect(mockLspManager.sendRequest).toHaveBeenCalledWith('callHierarchy/prepare', params);
            expect(result).toEqual(expectedResult);
        });

        it('should return null if lspManager.sendRequest resolves with null', async () => {
            const params: CallHierarchyPrepareParams = {
                textDocument: { uri: 'file:///test/project/doc.java' as DocumentUri },
                position: { line: 0, character: 0 }
            };

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            mockLspManager.sendRequest.mockResolvedValue(null as any);

            const result = await lspClient.prepareCallHierarchy(params);

            expect(mockLspManager.sendRequest).toHaveBeenCalledWith('callHierarchy/prepare', params);
            expect(result).toBeNull();
        });
    });

    describe('getIncomingCalls', () => {
        it('should call lspManager.sendRequest with "callHierarchy/incomingCalls" and correct params, returning the result', async () => {
            const params: CallHierarchyIncomingCallsParams = {
                item: {
                    name: 'testMethod',
                    kind: 3, // SymbolKind.Method
                    uri: 'file:///test/project/doc.java' as DocumentUri,
                    range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } },
                    selectionRange: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } }
                }
            };
            const expectedResult: CallHierarchyIncomingCall[] = [
                {
                    from: {
                        name: 'callerMethod',
                        kind: 3,
                        uri: 'file:///test/project/caller.java' as DocumentUri,
                        range: { start: { line: 5, character: 0 }, end: { line: 5, character: 20 } },
                        selectionRange: { start: { line: 5, character: 0 }, end: { line: 5, character: 20 } }
                    },
                    fromRanges: [{ start: { line: 5, character: 10 }, end: { line: 5, character: 18 } }]
                }
            ];

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            mockLspManager.sendRequest.mockResolvedValue(expectedResult as any);

            const result = await lspClient.getIncomingCalls(params);

            expect(mockLspManager.sendRequest).toHaveBeenCalledWith('callHierarchy/incomingCalls', params);
            expect(result).toEqual(expectedResult);
        });

        it('should return null if lspManager.sendRequest resolves with null', async () => {
            const params: CallHierarchyIncomingCallsParams = {
                item: {
                    name: 'testMethod',
                    kind: 3,
                    uri: 'file:///test/project/doc.java' as DocumentUri,
                    range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } },
                    selectionRange: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } }
                }
            };

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            mockLspManager.sendRequest.mockResolvedValue(null as any);

            const result = await lspClient.getIncomingCalls(params);

            expect(mockLspManager.sendRequest).toHaveBeenCalledWith('callHierarchy/incomingCalls', params);
            expect(result).toBeNull();
        });
    });

    describe('getOutgoingCalls', () => {
        it('should call lspManager.sendRequest with "callHierarchy/outgoingCalls" and correct params, returning the result', async () => {
            const params: CallHierarchyOutgoingCallsParams = {
                item: {
                    name: 'testMethod',
                    kind: 3, // SymbolKind.Method
                    uri: 'file:///test/project/doc.java' as DocumentUri,
                    range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } },
                    selectionRange: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } }
                }
            };
            const expectedResult: CallHierarchyOutgoingCall[] = [
                {
                    to: {
                        name: 'calleeMethod',
                        kind: 3,
                        uri: 'file:///test/project/callee.java' as DocumentUri,
                        range: { start: { line: 10, character: 0 }, end: { line: 10, character: 25 } },
                        selectionRange: { start: { line: 10, character: 0 }, end: { line: 10, character: 25 } }
                    },
                    fromRanges: [{ start: { line: 0, character: 5 }, end: { line: 0, character: 12 } }]
                }
            ];

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            mockLspManager.sendRequest.mockResolvedValue(expectedResult as any);

            const result = await lspClient.getOutgoingCalls(params);

            expect(mockLspManager.sendRequest).toHaveBeenCalledWith('callHierarchy/outgoingCalls', params);
            expect(result).toEqual(expectedResult);
        });

        it('should return null if lspManager.sendRequest resolves with null', async () => {
            const params: CallHierarchyOutgoingCallsParams = {
                item: {
                    name: 'testMethod',
                    kind: 3,
                    uri: 'file:///test/project/doc.java' as DocumentUri,
                    range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } },
                    selectionRange: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } }
                }
            };

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            mockLspManager.sendRequest.mockResolvedValue(null as any);

            const result = await lspClient.getOutgoingCalls(params);

            expect(mockLspManager.sendRequest).toHaveBeenCalledWith('callHierarchy/outgoingCalls', params);
            expect(result).toBeNull();
        });
    });

    describe('createPosition', () => {
        it('should return a Position object with the given line and character', () => {
            const line = 5;
            const character = 10;
            const expectedPosition: Position = { line, character };

            const result = LspClient.createPosition(line, character);

            expect(result).toEqual(expectedPosition);
        });
    });

    describe('createTextDocumentPositionParams', () => {
        it('should return TextDocumentPositionParams with the given uri, line, and character', () => {
            const uri = 'file:///test/project/doc.java' as DocumentUri;
            const line = 3;
            const character = 8;
            const expectedParams: TextDocumentPositionParams = {
                textDocument: { uri },
                position: { line, character }
            };

            const result = LspClient.createTextDocumentPositionParams(uri, line, character);

            expect(result).toEqual(expectedParams);
        });
    });
}); 