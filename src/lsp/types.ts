// Placeholder for LSP types. Consider using types from 'vscode-languageserver-protocol'

// Basic JSON-RPC Message Structures (as defined in docs/java_lsp.md)
export interface JsonRpcBaseMessage {
    jsonrpc: "2.0";
}

export interface JsonRpcRequest extends JsonRpcBaseMessage {
    id: number | string;
    method: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    params?: any;
}

export interface JsonRpcResponse extends JsonRpcBaseMessage {
    id: number | string | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result?: any;
    error?: JsonRpcError;
}

export interface JsonRpcNotification extends JsonRpcBaseMessage {
    method: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    params?: any;
}

export interface JsonRpcError {
    code: number;
    message: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: any;
}

// Common LSP types (examples, many more in the full protocol)
export type DocumentUri = string;

export interface Position {
    line: number;       // 0-indexed
    character: number;  // 0-indexed
}

export interface Range {
    start: Position;
    end: Position;
}

export interface Location {
    uri: DocumentUri;
    range: Range;
}

// Initialization
export interface InitializeParams {
    processId?: number | null;
    clientInfo?: {
        name: string;
        version?: string;
    };
    locale?: string;
    rootPath?: string | null;
    rootUri: DocumentUri | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    initializationOptions?: any;
    capabilities: ClientCapabilities;
    trace?: 'off' | 'messages' | 'verbose';
    workspaceFolders?: WorkspaceFolder[] | null;
}

export interface ClientCapabilities {
    // Define client capabilities, can be extensive
    // Example:
    textDocument?: {
        synchronization?: {
            dynamicRegistration?: boolean;
            willSave?: boolean;
            willSaveWaitUntil?: boolean;
            didSave?: boolean;
        };
        callHierarchy?: {
            dynamicRegistration?: boolean;
        };
        definition?: {
            dynamicRegistration?: boolean;
        };
        references?: {
            dynamicRegistration?: boolean;
        };
        documentSymbol?: DocumentSymbolClientCapabilities;
        hover?: HoverClientCapabilities;
        semanticTokens?: SemanticTokensClientCapabilities;
        // ... other text document capabilities
    };
    workspace?: {
        applyEdit?: boolean;
        workspaceFolders?: boolean | {
            supported?: boolean;
            changeNotifications?: boolean | string;
        };
        configuration?: boolean;
        // ... other workspace capabilities
    };
    // ... other general capabilities
}

export interface WorkspaceFolder {
    uri: DocumentUri;
    name: string;
}

export interface InitializeResult {
    capabilities: ServerCapabilities;
    serverInfo?: {
        name: string;
        version?: string;
    };
}

export interface ServerCapabilities {
    // Define server capabilities, can be extensive
    // Example:
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    textDocumentSync?: number | any; // TextDocumentSyncKind or TextDocumentSyncOptions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    definitionProvider?: boolean | any; // DefinitionOptions or DefinitionRegistrationOptions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    referencesProvider?: boolean | any; // ReferenceOptions or ReferenceRegistrationOptions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    callHierarchyProvider?: boolean | any; // CallHierarchyOptions or CallHierarchyRegistrationOptions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    hoverProvider?: boolean | any; // HoverOptions or HoverRegistrationOptions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    documentSymbolProvider?: boolean | any; // DocumentSymbolOptions or DocumentSymbolRegistrationOptions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    semanticTokensProvider?: boolean | any; // ADDED SemanticTokensOptions or SemanticTokensRegistrationOptions
    // ... other server capabilities
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface InitializedParams {}

// Text Document Synchronization
export interface DidOpenTextDocumentParams {
    textDocument: TextDocumentItem;
}

export interface TextDocumentItem {
    uri: DocumentUri;
    languageId: string;
    version: number;
    text: string;
}

// Call Hierarchy
export interface CallHierarchyPrepareParams {
    textDocument: TextDocumentIdentifier;
    position: Position;
}

export interface TextDocumentIdentifier {
    uri: DocumentUri;
}

export interface CallHierarchyItem {
    name: string;
    kind: number; // SymbolKind
    tags?: number[]; // SymbolTag
    detail?: string;
    uri: DocumentUri;
    range: Range;
    selectionRange: Range;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: any;
}

export interface CallHierarchyIncomingCallsParams {
    item: CallHierarchyItem;
}

export interface CallHierarchyIncomingCall {
    from: CallHierarchyItem;
    fromRanges: Range[];
}

export interface CallHierarchyOutgoingCallsParams {
    item: CallHierarchyItem;
}

export interface CallHierarchyOutgoingCall {
    to: CallHierarchyItem;
    fromRanges: Range[];
}

// Text Document Symbols
export interface DocumentSymbolParams {
    textDocument: TextDocumentIdentifier;
    // workDoneToken?: ProgressToken; // Optional
    // partialResultToken?: ProgressToken; // Optional
}

/**
 * Represents programming constructs like variables, classes, interfaces etc.
 * that appear in a document. Document symbols can be hierarchical.
 */
export interface DocumentSymbol {
    /**
     * The name of this symbol.
     */
    name: string;
    /**
     * More detail for this symbol, e.g the signature of a function.
     */
    detail?: string;
    /**
     * The kind of this symbol.
     */
    kind: SymbolKind;
    /**
     * Tags for this symbol.
     */
    tags?: SymbolTag[];
    /**
     * Indicates if this symbol is deprecated.
     */
    deprecated?: boolean;
    /**
     * The range enclosing this symbol not including leading/trailing whitespace
     * but everything else like comments. This information is typically used
     * to determine if the clients cursor is inside the symbol to reveal in the
     * symbol in the UI.
     */
    range: Range;
    /**
     * The range that should be selected and revealed when this symbol is being
     * picked, e.g the name of a function. Must be contained by the `range`.
     */
    selectionRange: Range;
    /**
     * Children of this symbol, e.g. properties of a class.
     */
    children?: DocumentSymbol[];
}

/**
 * Symbol tags are extra annotations that tweak the rendering of a symbol.
 * @since 3.16
 */
export enum SymbolTag {
    /**
     * Render a symbol as obsolete, usually using a strike-out.
     */
    Deprecated = 1
}

// The result of a textDocument/documentSymbol request is an array of
// DocumentSymbol or SymbolInformation instances.
// SymbolInformation is a flat list, DocumentSymbol is hierarchical.
// We will primarily work with DocumentSymbol for our purposes.
export interface SymbolInformation extends DocumentSymbol { // For simplicity, extending DocumentSymbol but structure is flatter in practice
    location: Location;
    // No children in SymbolInformation, it's a flat list.
    // DocumentSymbol properties like 'children' would effectively be undefined or null here.
    // The LSP spec defines SymbolInformation with 'name', 'kind', 'tags', 'deprecated', 'location', 'containerName'.
    // We'll keep it simpler for now and assume we primarily get DocumentSymbol[].
}

// Definitions and References
export interface TextDocumentPositionParams {
    textDocument: TextDocumentIdentifier;
    position: Position;
}

export type Definition = Location | Location[];
// Or LocationLink[] if supported by server:
// export interface LocationLink {
//     originSelectionRange?: Range;
//     targetUri: DocumentUri;
//     targetRange: Range;
//     targetSelectionRange: Range;
// }
// export type Definition = Location | Location[] | LocationLink[];

export interface ReferenceParams extends TextDocumentPositionParams {
    context: ReferenceContext;
}

export interface ReferenceContext {
    includeDeclaration: boolean;
}

// Symbol Kinds (subset, from LSP spec)
export enum SymbolKind {
    File = 1,
    Module = 2,
    Namespace = 3,
    Package = 4,
    Class = 5,
    Method = 6,
    Property = 7,
    Field = 8,
    Constructor = 9,
    Enum = 10,
    Interface = 11,
    Function = 12,
    Variable = 13,
    Constant = 14,
    String = 15,
    Number = 16,
    Boolean = 17,
    Array = 18,
    Object = 19,
    Key = 20,
    Null = 21,
    EnumMember = 22,
    Struct = 23,
    Event = 24,
    Operator = 25,
    TypeParameter = 26
}

// ADD THIS NEW INTERFACE
export interface DocumentSymbolClientCapabilities {
    /**
     * Whether document symbol supports dynamic registration.
     */
    dynamicRegistration?: boolean;
    /**
     * Specific capabilities for the `SymbolKind` in the `textDocument/documentSymbol` request.
     */
    symbolKind?: {
        /**
         * The symbol kind values the client supports. When this
         * property exists the client also guarantees that it will
         * handle values outside its set gracefully and falls back
         * to a default value when unknown.
         *
         * If this property is not present the client only supports
         * the symbol kinds from `File` to `Array` as defined in
         * the initial version of the protocol.
         */
        valueSet?: SymbolKind[];
    };
    /**
     * The client supports hierarchical document symbols.
     */
    hierarchicalDocumentSymbolSupport?: boolean;
    /**
     * The client supports tags on `SymbolInformation`. Tags are supported on
     * `DocumentSymbol` if `hierarchicalDocumentSymbolSupport` is set to true.
     * Clients supporting tags have to handle unknown tags gracefully.
     *
     * @since 3.16.0
     */
    tagSupport?: {
        /**
         * The tags supported by the client.
         */
        valueSet: SymbolTag[];
    };
    /**
     * The client supports an additional label presented in the UI when
     * registering a symbol provider.
     *
     * @since 3.16.0
     */
    labelSupport?: boolean;
}

// Hover
export interface HoverClientCapabilities {
    /**
     * Whether hover supports dynamic registration.
     */
    dynamicRegistration?: boolean;
    /**
     * Client supports the following content formats for Hover
     * results. (ContentFormat is deprecated in favor of MarkupKind)
     */
    contentFormat?: MarkupKind[];
}

// Hover Types
export type HoverParams = TextDocumentPositionParams;

/**
 * The result of a hover request.
 */
export interface Hover {
    /**
     * The hover's content
     */
    contents: MarkupContent | MarkedString | MarkedString[];
    /**
     * An optional range is a range inside a text document
     * that is used to visualize a hover, e.g. by changing the background color.
     */
    range?: Range;
}

/**
 * Describes the content type that a client supports in various
 * result literals like `Hover`, `ParameterInformation` or `CompletionItem`.
 *
 * Please note that `MarkupKinds` must not start with a `$`. These kinds
 * are reserved for market place descriptions.
 */
export enum MarkupKind {
    /**
     * Plain text is supported as a content format
     */
    PlainText = 'plaintext',
    /**
     * Markdown is supported as a content format
     */
    Markdown = 'markdown'
}

/**
 * MarkedString can be used to render human readable text. It is either a markdown string
 * or a code-block that provides a language and a code snippet. The language identifier
 * is semantically equal to the optional language identifier in fenced code blocks in GFM.
 */
export type MarkedString = string | { language: string; value: string };

/**
 * A `MarkupContent` literal represents a string value which content is interpreted based on its
 * kind flag. Currently the protocol supports `plaintext` and `markdown` as markup kinds.
 *
 * If the kind is `markdown` then the value can contain fenced code blocks like in GitHub issues.
 * See https://help.github.com/articles/creating-and-highlighting-code-blocks/#syntax-highlighting
 *
 * Here is an example how such a string can be constructed using JavaScript:
 * ```typescript
 * let markdown: MarkupContent = {
 *  kind: MarkupKind.Markdown,
 *  value: [
 *      '# Header',
 *      'Some text',
 *      '```typescript',
 *      'someCode();',
 *      '```'
 *  ].join('\n')
 * };
 * ```
 *
 * *Please Note* that clients might sanitize the return markdown. A client could decide to
 * remove HTML from the markdown to prevent script execution.
 */
export interface MarkupContent {
    kind: MarkupKind;
    value: string;
}

// Semantic Tokens
export interface SemanticTokensClientCapabilities {
    /**
     * Whether implementation supports dynamic registration. If this is set to
     * `true` the client supports the new `(TextDocumentRegistrationOptions &
     * StaticRegistrationOptions)` return value for the corresponding server
     * capability as well.
     */
    dynamicRegistration?: boolean;
    /**
     * Which requests the client supports and might send to the server
     * depending on the server capabilities.
     */
    requests: {
        /**
         * The client will send the `textDocument/semanticTokens/range` request
         * if the server provides a corresponding handler.
         */
        range?: boolean | object;
        /**
         * The client will send the `textDocument/semanticTokens/full` request
         * if the server provides a corresponding handler.
         */
        full?: boolean | {
            /**
             * The client will send the `textDocument/semanticTokens/full/delta`
             * request if the server provides a corresponding handler.
             */
            delta?: boolean;
        } | object;
    };
    /**
     * The token types that the client supports.
     */
    tokenTypes: string[];
    /**
     * The token modifiers that the client supports.
     */
    tokenModifiers: string[];
    /**
     * The formats the clients supports.
     */
    formats: TokenFormat[];
    /**
     * Whether the client supports tokens that can overlap each other.
     */
    overlappingTokenSupport?: boolean;
    /**
     * Whether the client supports tokens that can span multiple lines.
     */
    multilineTokenSupport?: boolean;
    /**
     * Whether the client allows the server to actively push semantic tokens
     * over the network.
     *
     * @since 3.17.0
     */
    serverCancelSupport?: boolean;
    /**
     * Whether the client supports augmenting semantic tokens on top of
     * existing tokens.
     *
     * @since 3.17.0
     */
    augmentsSyntaxTokens?: boolean;
}

export type TokenFormat = 'relative'; // Only relative format is required by spec

// Semantic Token Types
export interface SemanticTokensParams { // Used for full request
    /**
     * The text document.
     */
    textDocument: TextDocumentIdentifier;
    // partialResultToken?: ProgressToken;
    // workDoneToken?: ProgressToken;
}

// Not defining SemanticTokensRangeParams, SemanticTokensDeltaParams for now

export interface SemanticTokens {
    /**
     * An optional result id. If provided it will
     * be sent on the next character typing.
     *
     * This is used forデルタ計算 (delta computation).
     */
    resultId?: string;
    /**
     * The actual tokens data.
     * An array of unsigned integers.
     * Each group of 5 integers represents a token:
     * - deltaLine: relative line number
     * - deltaStartChar: relative start character
     * - length: length of the token
     * - tokenType: index into the SemanticTokensLegend.tokenTypes array
     * - tokenModifiers: bitmask using indices from SemanticTokensLegend.tokenModifiers array
     */
    data: number[];
}

/**
 * The legend is provided by the server in response to the `initialize` request.
 */
export interface SemanticTokensLegend {
    /**
     * The token types the server supports.
     */
    tokenTypes: string[];
    /**
     * The token modifiers the server supports.
     */
    tokenModifiers: string[];
}

// Placeholders for standard token types and modifiers
// Clients need to understand the server's legend (from InitializeResult)
// These enums might not perfectly match the server's legend but are standard.
export enum SemanticTokenTypes {
    namespace = 'namespace',
    type = 'type', // class, interface, enum, etc.
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
    // Added based on JDT LS capability log:
    annotation = 'annotation',
    annotationMember = 'annotationMember',
    record = 'record',
    recordComponent = 'recordComponent'
}

export enum SemanticTokenModifiers {
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
    // Added based on JDT LS capability log:
    public = 'public',
    private = 'private',
    protected = 'protected',
    native = 'native',
    generic = 'generic',
    typeArgument = 'typeArgument',
    importDeclaration = 'importDeclaration',
    constructor = 'constructor'
} 