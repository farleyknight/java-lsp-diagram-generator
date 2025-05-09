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
    ClientCapabilities,
    DocumentSymbolParams,
    HoverParams,
    SemanticTokensParams
} from '../../src/lsp/types';
import { JavaLspConfig } from '../../src/config/lsp_config';

// Mock LspManager
// Adjust the mock path based on the new file location
jest.mock('../../src/lsp/lsp_manager'); // Automatically mocks all methods

const MockLspManager = LspManager as jest.MockedClass<typeof LspManager>; // Get the mocked class type

describe('LspClient', () => {
    let mockLspManagerInstance: jest.Mocked<LspManager>;
    let lspClient: LspClient;
    let dummyConfig: JavaLspConfig;
    const dummyProjectRoot = '/dummy/project';

    beforeEach(() => {
        // Clear all instances and calls to constructor and all methods: 
        MockLspManager.mockClear();
        // Create a new mock instance for LspManager before each test
        // This also allows us to spy on methods of this specific instance
        dummyConfig = {
            serverCommand: 'dummy',
            lspServerInstallDir: '/dummy/lsp',
            serverArgs: [],
            workspaceDataPath: '/dummy/data',
            logLevel: 'OFF'
        };
        mockLspManagerInstance = new MockLspManager(dummyConfig, dummyProjectRoot) as jest.Mocked<LspManager>; 
        lspClient = new LspClient(mockLspManagerInstance);
    });

    // Test suite for request methods
    describe('Request Methods', () => {
        it('should send "initialize" request via LspManager', async () => {
            const params: InitializeParams = { rootUri: null, capabilities: {} } as InitializeParams; // Simplified params
            const expectedResult = { capabilities: {} };
            mockLspManagerInstance.sendRequest.mockResolvedValue(expectedResult);

            const result = await lspClient.initialize(params);

            expect(mockLspManagerInstance.sendRequest).toHaveBeenCalledWith('initialize', params);
            expect(result).toBe(expectedResult);
        });

        it('should send "shutdown" request via LspManager', async () => {
            mockLspManagerInstance.sendRequest.mockResolvedValue(undefined); // Shutdown returns void
            await lspClient.shutdown();
            expect(mockLspManagerInstance.sendRequest).toHaveBeenCalledWith('shutdown', null);
        });

        it('should send "textDocument/definition" request', async () => {
            const params: TextDocumentPositionParams = { textDocument: { uri: 'file:///test.java' }, position: { line: 0, character: 0 } };
            mockLspManagerInstance.sendRequest.mockResolvedValue(null);
            await lspClient.getTextDocumentDefinition(params);
            expect(mockLspManagerInstance.sendRequest).toHaveBeenCalledWith('textDocument/definition', params);
        });

        it('should send "textDocument/references" request', async () => {
            const params: ReferenceParams = { 
                textDocument: { uri: 'file:///test.java' }, 
                position: { line: 0, character: 0 }, 
                context: { includeDeclaration: true }
            };
            mockLspManagerInstance.sendRequest.mockResolvedValue([]);
            await lspClient.getTextDocumentReferences(params);
            expect(mockLspManagerInstance.sendRequest).toHaveBeenCalledWith('textDocument/references', params);
        });

        it('should send "callHierarchy/prepare" request', async () => {
            const params: CallHierarchyPrepareParams = { textDocument: { uri: 'file:///test.java' }, position: { line: 0, character: 0 } };
            mockLspManagerInstance.sendRequest.mockResolvedValue([]);
            await lspClient.prepareCallHierarchy(params);
            expect(mockLspManagerInstance.sendRequest).toHaveBeenCalledWith('callHierarchy/prepare', params);
        });

        it('should send "callHierarchy/incomingCalls" request', async () => {
            const params: CallHierarchyIncomingCallsParams = { item: {} as any }; // Simplified item
            mockLspManagerInstance.sendRequest.mockResolvedValue([]);
            await lspClient.getIncomingCalls(params);
            expect(mockLspManagerInstance.sendRequest).toHaveBeenCalledWith('callHierarchy/incomingCalls', params);
        });

        it('should send "callHierarchy/outgoingCalls" request', async () => {
            const params: CallHierarchyOutgoingCallsParams = { item: {} as any }; // Simplified item
            mockLspManagerInstance.sendRequest.mockResolvedValue([]);
            await lspClient.getOutgoingCalls(params);
            expect(mockLspManagerInstance.sendRequest).toHaveBeenCalledWith('callHierarchy/outgoingCalls', params);
        });

        it('should send "textDocument/documentSymbol" request', async () => {
            const params: DocumentSymbolParams = { textDocument: { uri: 'file:///test.java' } };
            mockLspManagerInstance.sendRequest.mockResolvedValue([]);
            await lspClient.getDocumentSymbols(params);
            expect(mockLspManagerInstance.sendRequest).toHaveBeenCalledWith('textDocument/documentSymbol', params);
        });

        it('should send "textDocument/hover" request', async () => {
            const params: HoverParams = { textDocument: { uri: 'file:///test.java' }, position: { line: 0, character: 0 } };
            mockLspManagerInstance.sendRequest.mockResolvedValue(null);
            await lspClient.getTextDocumentHover(params);
            expect(mockLspManagerInstance.sendRequest).toHaveBeenCalledWith('textDocument/hover', params);
        });

        it('should send "textDocument/semanticTokens/full" request', async () => {
            const params: SemanticTokensParams = { textDocument: { uri: 'file:///test.java' } };
            mockLspManagerInstance.sendRequest.mockResolvedValue(null);
            await lspClient.getSemanticTokensFull(params);
            expect(mockLspManagerInstance.sendRequest).toHaveBeenCalledWith('textDocument/semanticTokens/full', params);
        });
    });

    // Test suite for notification methods
    describe('Notification Methods', () => {
        it('should send "initialized" notification via LspManager', () => {
            const params: InitializedParams = {};
            lspClient.initialized(params);
            expect(mockLspManagerInstance.sendNotification).toHaveBeenCalledWith('initialized', params);
        });

        it('should send "exit" notification via LspManager', () => {
            lspClient.exit();
            expect(mockLspManagerInstance.sendNotification).toHaveBeenCalledWith('exit', null);
        });

        it('should send "textDocument/didOpen" notification', () => {
            const params: DidOpenTextDocumentParams = { 
                textDocument: { uri: 'file:///test.java', languageId: 'java', version: 1, text: '' } 
            };
            lspClient.textDocumentDidOpen(params);
            expect(mockLspManagerInstance.sendNotification).toHaveBeenCalledWith('textDocument/didOpen', params);
        });
    });

    // Test suite for static utility methods
    describe('Static Utility Methods', () => {
        it('createPosition should return a Position object', () => {
            const line = 5;
            const character = 10;
            const expectedPosition: Position = { line, character };
            const position = LspClient.createPosition(line, character);
            expect(position).toEqual(expectedPosition);
        });

        it('createTextDocumentPositionParams should return TextDocumentPositionParams object', () => {
            const uri: DocumentUri = 'file:///path/to/file.java';
            const line = 1;
            const character = 2;
            const expectedParams: TextDocumentPositionParams = {
                textDocument: { uri },
                position: { line, character }
            };
            const params = LspClient.createTextDocumentPositionParams(uri, line, character);
            expect(params).toEqual(expectedParams);
        });
    });
}); 