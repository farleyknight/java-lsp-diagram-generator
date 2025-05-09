import {
    Position as LSPPosition,
    Range as LSPRange,
    Location as LSPLocation,
    TextDocumentIdentifier as LSPTextDocumentIdentifier,
    InitializeParams as LSPInitializeParams,
    InitializeResult as LSPInitializeResult,
    TextDocumentItem as LSPTextDocumentItem,
    MarkupContent as LSPMarkupContent,
    MarkedString as LSPMarkedString,
    MarkupKind as LSPMarkupKind,
    Hover as LSPHover,
    TextDocumentPositionParams as LSPTextDocumentPositionParams,
    HoverParams as LSPHoverParams,
    CallHierarchyIncomingCall as LSPCallHierarchyIncomingCall,
    CallHierarchyOutgoingCall as LSPCallHierarchyOutgoingCall,
    // Add other essential, simple types from 'vscode-languageserver-protocol' as needed
} from 'vscode-languageserver-protocol';

// Basic JSON-RPC Message Structures
export interface JsonRpcBaseMessage {
    jsonrpc: "2.0";
}

export interface JsonRpcRequest extends JsonRpcBaseMessage {
    id: number | string;
    method: string;
    params?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export interface JsonRpcResponse extends JsonRpcBaseMessage {
    id: number | string | null;
    result?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    error?: JsonRpcError;
}

export interface JsonRpcNotification extends JsonRpcBaseMessage {
    method: string;
    params?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export interface JsonRpcError {
    code: number;
    message: string;
    data?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

// Common LSP types
export type DocumentUri = string;

// Re-exporting core types with potential aliasing if we stick to these names
export type Position = LSPPosition;
export type Range = LSPRange;
export type Location = LSPLocation;
export type TextDocumentIdentifier = LSPTextDocumentIdentifier;
export type TextDocumentItem = LSPTextDocumentItem;
export type InitializeParams = LSPInitializeParams;
export type InitializeResult = LSPInitializeResult;
export type MarkupContent = LSPMarkupContent;
export type MarkedString = LSPMarkedString;
export type MarkupKind = LSPMarkupKind;
export type Hover = LSPHover;

// ADDED Re-exports
export type TextDocumentPositionParams = LSPTextDocumentPositionParams;
export type HoverParams = LSPHoverParams;
export type CallHierarchyIncomingCall = LSPCallHierarchyIncomingCall;
export type CallHierarchyOutgoingCall = LSPCallHierarchyOutgoingCall;

// Placeholder for more complex types - to be defined properly later or kept as 'any'
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface InitializedParams {} // Often empty

export interface ClientCapabilities {
    textDocument?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    workspace?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    window?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    general?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    experimental?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    [key: string]: any; // Allow other properties
}

export interface ServerCapabilities {
    textDocumentSync?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    hoverProvider?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    definitionProvider?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    referencesProvider?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    documentSymbolProvider?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    semanticTokensProvider?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    callHierarchyProvider?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    workspace?: {
        workspaceFolders?: {
            supported?: boolean;
            changeNotifications?: string | boolean;
        };
    };
    [key: string]: any; // Allow other properties
}

export interface WorkspaceFolder {
    uri: DocumentUri;
    name: string;
}


// Semantic Tokens (Simplified for now)
export enum SemanticTokenTypes {
    // Keeping JDT specific extensions - these are string enums
    namespace = 'namespace',
    type = 'type',
    class = 'class',
    enum = 'enum',
    interface = 'interface',
    struct = 'struct',
    typeParameter = 'typeParameter',
    parameter = 'parameter',
    variable = 'variable',
    property = 'property',
    enumMember = 'enumMember',
    event = 'event',
    function = 'function',
    method = 'method',
    macro = 'macro',
    keyword = 'keyword',
    modifier = 'modifier',
    comment = 'comment',
    string = 'string',
    number = 'number',
    regexp = 'regexp',
    operator = 'operator',
    annotation = 'annotation',
    annotationMember = 'annotationMember',
    record = 'record',
    recordComponent = 'recordComponent'
}

export enum SemanticTokenModifiers {
    // Keeping JDT specific extensions
    declaration = 'declaration',
    definition = 'definition',
    readonly = 'readonly',
    static = 'static',
    deprecated = 'deprecated',
    abstract = 'abstract',
    async = 'async',
    modification = 'modification',
    documentation = 'documentation',
    defaultLibrary = 'defaultLibrary',
    public = 'public',
    private = 'private',
    protected = 'protected',
    native = 'native',
    generic = 'generic',
    typeArgument = 'typeArgument',
    importDeclaration = 'importDeclaration',
    constructor = 'constructor'
}

export type TokenFormat = 'relative';

export interface SemanticTokensLegend {
    tokenTypes: string[];
    tokenModifiers: string[];
}

export interface SemanticTokensParams {
    textDocument: TextDocumentIdentifier;
    [key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export interface SemanticTokens {
    resultId?: string;
    data: number[];
    [key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

// Call Hierarchy (Simplified)
export interface CallHierarchyPrepareParams {
    textDocument: TextDocumentIdentifier;
    position: Position;
    [key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export interface CallHierarchyItem {
    name: string;
    kind: any; // Using SymbolKind from library would be better later
    uri: DocumentUri;
    range: Range;
    selectionRange: Range;
    data?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    [key: string]: any; // Allow other properties
}

export interface CallHierarchyIncomingCallsParams {
    item: CallHierarchyItem;
    [key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export interface CallHierarchyOutgoingCallsParams {
    item: CallHierarchyItem;
    [key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

// Other simplified param/result types as needed
export interface DefinitionParams {
    textDocument: TextDocumentIdentifier;
    position: Position;
    [key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export type Definition = Location | Location[] | any; // eslint-disable-line @typescript-eslint/no-explicit-any

export interface ReferenceParams {
    textDocument: TextDocumentIdentifier;
    position: Position;
    context: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    [key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export interface DocumentSymbolParams {
    textDocument: TextDocumentIdentifier;
    [key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export type DocumentSymbol = any; // eslint-disable-line @typescript-eslint/no-explicit-any

export interface DidOpenTextDocumentParams {
    textDocument: TextDocumentItem;
}

// Client Capability sub-types (can be refined later from ClientCapabilities)
export interface DocumentSymbolClientCapabilities {
    [key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export interface HoverClientCapabilities {
    [key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export interface SemanticTokensClientCapabilities {
    requests?: {
        range?: boolean | object;
        full?: boolean | { delta?: boolean } | object;
    };
    tokenTypes?: string[];
    tokenModifiers?: string[];
    formats?: TokenFormat[];
    [key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

// SymbolKind and SymbolTag enums from vscode-languageserver-protocol might be useful to import directly later
export type SymbolKind = number; // Placeholder, import from library later
export type SymbolTag = number;  // Placeholder, import from library later