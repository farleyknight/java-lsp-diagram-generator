import { LspManager } from './lsp_manager';
import {
    InitializeParams,
    InitializeResult,
    InitializedParams,
    DidOpenTextDocumentParams,
    // DidChangeTextDocumentParams, // Add if needed
    // DidSaveTextDocumentParams,  // Add if needed
    // DidCloseTextDocumentParams, // Add if needed
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
    DocumentSymbolParams,
    DocumentSymbol,
    HoverParams,
    Hover,
    SemanticTokensParams,
    SemanticTokens
} from './types';

export class LspClient {
    private lspManager: LspManager;

    constructor(lspManager: LspManager) {
        this.lspManager = lspManager;
    }

    public initialize(params: InitializeParams): Promise<InitializeResult> {
        return this.lspManager.sendRequest<InitializeParams, InitializeResult>('initialize', params);
    }

    public initialized(params: InitializedParams): void {
        this.lspManager.sendNotification<InitializedParams>('initialized', params);
    }

    public shutdown(): Promise<void> {
        return this.lspManager.sendRequest<null, void>('shutdown', null);
    }

    public exit(): void {
        this.lspManager.sendNotification<null>('exit', null);
    }

    public textDocumentDidOpen(params: DidOpenTextDocumentParams): void {
        this.lspManager.sendNotification<DidOpenTextDocumentParams>('textDocument/didOpen', params);
    }

    // public textDocumentDidChange(params: DidChangeTextDocumentParams): void {
    //     this.lspManager.sendNotification<DidChangeTextDocumentParams>('textDocument/didChange', params);
    // }

    // public textDocumentDidSave(params: DidSaveTextDocumentParams): void {
    //     this.lspManager.sendNotification<DidSaveTextDocumentParams>('textDocument/didSave', params);
    // }

    // public textDocumentDidClose(params: DidCloseTextDocumentParams): void {
    //     this.lspManager.sendNotification<DidCloseTextDocumentParams>('textDocument/didClose', params);
    // }

    public getTextDocumentDefinition(params: TextDocumentPositionParams): Promise<Definition | null> {
        return this.lspManager.sendRequest<TextDocumentPositionParams, Definition | null>('textDocument/definition', params);
    }

    public getTextDocumentReferences(params: ReferenceParams): Promise<Location[] | null> {
        return this.lspManager.sendRequest<ReferenceParams, Location[] | null>('textDocument/references', params);
    }

    public prepareCallHierarchy(params: CallHierarchyPrepareParams): Promise<CallHierarchyItem[] | null> {
        return this.lspManager.sendRequest<CallHierarchyPrepareParams, CallHierarchyItem[] | null>('callHierarchy/prepare', params);
    }

    public getIncomingCalls(params: CallHierarchyIncomingCallsParams): Promise<CallHierarchyIncomingCall[] | null> {
        return this.lspManager.sendRequest<CallHierarchyIncomingCallsParams, CallHierarchyIncomingCall[] | null>('callHierarchy/incomingCalls', params);
    }

    public getOutgoingCalls(params: CallHierarchyOutgoingCallsParams): Promise<CallHierarchyOutgoingCall[] | null> {
        return this.lspManager.sendRequest<CallHierarchyOutgoingCallsParams, CallHierarchyOutgoingCall[] | null>('callHierarchy/outgoingCalls', params);
    }

    public getDocumentSymbols(params: DocumentSymbolParams): Promise<DocumentSymbol[] | null> {
        return this.lspManager.sendRequest<DocumentSymbolParams, DocumentSymbol[] | null>('textDocument/documentSymbol', params);
    }

    public getTextDocumentHover(params: HoverParams): Promise<Hover | null> {
        return this.lspManager.sendRequest<HoverParams, Hover | null>('textDocument/hover', params);
    }

    public getSemanticTokensFull(params: SemanticTokensParams): Promise<SemanticTokens | null> {
        return this.lspManager.sendRequest<SemanticTokensParams, SemanticTokens | null>('textDocument/semanticTokens/full', params);
    }
    
    // Utility to convert 0-indexed line/char to LSP Position
    public static createPosition(line: number, character: number): Position {
        return { line, character };
    }

    // Utility to create TextDocumentPositionParams
    public static createTextDocumentPositionParams(uri: DocumentUri, line: number, character: number): TextDocumentPositionParams {
        return {
            textDocument: { uri },
            position: this.createPosition(line, character)
        };
    }
} 