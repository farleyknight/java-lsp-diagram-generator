# Java LSP Interaction

This document outlines the implementation details for launching and interacting with a Java Language Server Protocol (LSP) server.

## Launching the Java LSP Server

1.  **Prerequisites**:
    *   Ensure a Java Development Kit (JDK) **version 21 or higher** is installed and accessible (e.g., via `JAVA_HOME` or on the system `PATH`). ([Source](https://github.com/eclipse-jdtls/eclipse.jdt.ls) - Requirements)
    *   Download the Java LSP server (Eclipse JDT LS). 
        *   The provided `scripts/install-lsp.sh` script automates this by downloading the latest snapshot from `http://download.eclipse.org/jdtls/snapshots/` and extracting it to `bin/eclipse.jdt.ls/`.
        *   Alternatively, manual download options include:
            *   Milestone builds: `http://download.eclipse.org/jdtls/milestones/`
            *   Snapshot builds: `http://download.eclipse.org/jdtls/snapshots/`
        *   If downloading manually, extract the downloaded archive into a known location (e.g., `bin/eclipse.jdt.ls/` in our project, which is the default for the install script).
        ([Source](https://github.com/eclipse-jdtls/eclipse.jdt.ls) - Installation)

2.  **Server Distribution**: The LSP server is distributed as an archive containing multiple JARs and configuration files. The key JAR for launching is typically `org.eclipse.equinox.launcher_VERSION.jar` located in a `plugins` subdirectory of the extracted server.

3.  **Command Structure**: The server is launched as a standard Java application. The command structure, based on the `eclipse.jdt.ls` documentation, is as follows:

    ```bash
    java \
        -Declipse.application=org.eclipse.jdt.ls.core.id1 \
        -Dosgi.bundles.defaultStartLevel=4 \
        -Declipse.product=org.eclipse.jdt.ls.core.product \
        -Dlog.level=ALL \
        -Xmx1G \
        --add-modules=ALL-SYSTEM \
        --add-opens java.base/java.util=ALL-UNNAMED \
        --add-opens java.base/java.lang=ALL-UNNAMED \
        -jar <path_to_extracted_server>/plugins/org.eclipse.equinox.launcher_VERSION.jar \
        -configuration <path_to_extracted_server>/config_OS \
        -data <absolute_path_to_project_workspace_data>
    ```
    ([Source](https://github.com/eclipse-jdtls/eclipse.jdt.ls) - Running from the command line)

    *   **`<path_to_extracted_server>`**: The directory where you extracted the downloaded LSP server.
    *   **`org.eclipse.equinox.launcher_VERSION.jar`**: Replace `VERSION` with the actual version of the launcher JAR found in the `plugins` directory.
    *   **`-configuration <path_to_extracted_server>/config_OS`**: Specifies the platform-specific configuration directory. Replace `config_OS` with:
        *   `config_linux` for Linux
        *   `config_win` for Windows
        *   `config_mac` for macOS
    *   **`-data <absolute_path_to_project_workspace_data>`**: This is a crucial parameter. It must be an **absolute path** to a writable directory where `eclipse.jdt.ls` will store metadata, index files, and other information specific to the Java project being analyzed. This directory should be unique for each Java project. For example, if analyzing `/Users/me/myJavaProject`, the `-data` path could be `/Users/me/myJavaProject/.jdt_ws_data` or similar.

4.  **Communication Channels**: The LSP server will communicate over standard input/output (stdin/stdout) by default when launched with the command above. This is suitable for our Node.js application to launch the LSP as a child process. ([Source](https://github.com/eclipse-jdtls/eclipse.jdt.ls) - Managing connection types)

## Interacting via JSON-RPC

The Language Server Protocol defines messages exchanged between the client (our Node.js application) and the server (Java LSP) using JSON-RPC 2.0.

1.  **JSON-RPC Basics**:
    *   **Requests**: Messages sent from the client to the server that expect a response (e.g., `initialize`, `textDocument/definition`, `textDocument/references`). Each request has an `id`.
    *   **Responses**: Messages sent from the server to the client in reply to a request. They must have the same `id` as the request. They contain either a `result` or an `error` object.
    *   **Notifications**: Messages sent from either the client or the server that do not expect a response (e.g., `textDocument/didOpen`, `textDocument/didChange`). They do not have an `id`.

2.  **Message Formatting**:
    *   Each JSON-RPC message is preceded by a header part and then the JSON content part, separated by `\r\n`.
    *   **Header**:
        *   `Content-Length: <number>`: Specifies the length of the JSON content in bytes.
        *   `Content-Type: <string>` (optional, defaults to `application/vscode-jsonrpc; charset=utf-8`): Specifies the content type.
    *   **Content**: The actual JSON-RPC request, response, or notification object.

    Example of a message structure:
    ```
    Content-Length: 123

    

    {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            // ... initialization parameters
        }
    }
    ```

3.  **Node.js Implementation**:
    *   **Child Process**: Launch the Java LSP server as a child process using Node.js's `child_process.spawn()`.
    *   **Streams**: Use the child process's `stdin` stream to send messages to the LSP server and its `stdout` stream to receive messages from the server.
    *   **Message Parsing/Serialization**:
        *   When sending: Construct the JSON-RPC object, serialize it to a JSON string, calculate its byte length, and format the full message with headers.
        *   When receiving: Buffer incoming data from `stdout`. Parse the `Content-Length` header to determine how many bytes to read for the JSON content. Once the complete JSON content is received, parse it.
    *   **Request/Response Matching**: Maintain a map of pending requests (using their `id`) to correlate incoming responses with the original requests.
    *   **LSP Client Library**: Consider using an existing Node.js LSP client library (e.g., `vscode-languageclient` or a more lightweight alternative specifically for JSON-RPC) to handle the low-level details of message framing, serialization, and request/response management. This can significantly simplify development.

## Key LSP Requests for Call Hierarchy

For determining call hierarchies, the following LSP requests will be crucial:

*   **`initialize`**: The first request sent by the client to the server to negotiate capabilities. The client needs to specify its capabilities, and the server responds with its capabilities.
*   **`initialized`**: A notification sent from the client to the server after the `initialize` request has been processed.
*   **`textDocument/didOpen`**: Notifies the server that a document has been opened by the client. The server will then start analyzing it.
*   **`textDocument/definition`**: Asks the server to go to the definition of a symbol at a given text document position. This can be used to find the declaration of a method.
*   **`textDocument/references`**: Finds all references to a symbol at a given text document position. This is essential for finding where a method is called (i.e., incoming calls).
*   **`callHierarchy/prepare`** (if supported by the Java LSP): Prepares a call hierarchy for a symbol at a given text document position. This is a more direct way to start building a call hierarchy.
*   **`callHierarchy/incomingCalls`** (if supported): Resolves incoming calls for a call hierarchy item.
*   **`callHierarchy/outgoingCalls`** (if supported): Resolves outgoing calls for a call hierarchy item.

**Important Note on JDT LS Call Hierarchy Support (as of v1.47 / April 2025 snapshot):**
Initial integration testing revealed that while the JDT LS server advertises `callHierarchyProvider: true` in its capabilities during initialization, it subsequently returns an error (`Unsupported request method`, code `-32601`) when the `callHierarchy/prepare` request is actually sent. 

Therefore, relying solely on the `callHierarchy/*` methods may not be feasible with this JDT LS version. 

The current implementation strategy involves:
1.  Using `textDocument/references` with `includeDeclaration: true` to find incoming calls (and the definition itself).
2.  Building outgoing call information may require a different approach, potentially combining `textDocument/definition` on symbols within a method body with AST parsing (using `java-ast`) to identify method call expressions accurately.

If the direct `callHierarchy/*` requests are not fully supported or do not provide enough control, a combination of `textDocument/definition` and `textDocument/references`, along with AST parsing via `java-ast` for context, will be needed to recursively build the call tree.

## Error Handling and Shutdown

*   Implement robust error handling for JSON-RPC communication (e.g., malformed messages, server errors).
*   Properly shut down the LSP server using the `shutdown` request followed by an `exit` notification when our application closes or no longer needs the LSP.

## Key Files and Their Roles

For the Node.js TypeScript implementation of the Java LSP client, we anticipate creating the following key files:

*   **`src/lsp/lsp_manager.ts`**: This class would be responsible for the lifecycle of the Java LSP server process. It will handle spawning the child process, managing its `stdin`/`stdout`/`stderr` streams, and gracefully shutting it down. It will also be the central point for sending requests and dispatching received responses/notifications.
    *   **Class: `LspManager`**
        *   **Properties:**
            *   `childProcess: ChildProcess | null`
            *   `requestCounter: number`
            *   `pendingRequests: Map<number, (response: any) => void>`
            *   `lspServerPath: string`
            *   `lspServerArgs: string[]`
        *   **Constructor:**
            *   `constructor(lspServerPath: string, lspServerArgs: string[])`
        *   **Methods:**
            *   `startServer(): Promise<void>`: Spawns the LSP server process, sets up stream listeners.
            *   `stopServer(): Promise<void>`: Sends `shutdown` and `exit` notifications, kills the process if necessary.
            *   `sendRequest<TParams, TResult>(method: string, params: TParams): Promise<TResult>`: Formats and sends a JSON-RPC request, stores the promise resolver for the response.
            *   `sendNotification<TParams>(method: string, params: TParams): void`: Formats and sends a JSON-RPC notification.
            *   `private handleData(data: Buffer): void`: Parses incoming data from LSP server stdout, splits messages, and dispatches them.
            *   `private handleMessage(message: LspResponse | LspNotification): void`: Processes a complete JSON-RPC message, resolving pending requests or emitting notification events.
            *   `private handleError(error: Error): void`: Handles errors from the LSP server process or stderr.
            *   `onNotification(event: string, listener: (params: any) => void): void`: Allows other modules to listen for specific LSP notifications.
*   **`src/lsp/json_rpc_protocol.ts`**: This file will contain utility functions for formatting and parsing JSON-RPC messages according to the LSP specification. This includes adding the `Content-Length` headers and handling the `\r\n` separators.
    *   **Functions:**
        *   `formatRequestMessage<TParams>(id: number, method: string, params: TParams): string`: Creates a JSON-RPC request string with headers.
        *   `formatNotificationMessage<TParams>(method: string, params: TParams): string`: Creates a JSON-RPC notification string with headers.
        *   `parseMessage(buffer: Buffer): { message: LspResponse | LspNotification | null, remainingBuffer: Buffer }`: Tries to parse a complete JSON-RPC message from the start of a buffer, returns the parsed message and the remaining unparsed buffer part. Extracts `Content-Length` and reads the JSON body.
    *   **Interfaces (might also be in `types.ts`):**
        *   `JsonRpcBaseMessage { jsonrpc: "2.0" }`
        *   `JsonRpcRequest extends JsonRpcBaseMessage { id: number | string; method: string; params?: any; }`
        *   `JsonRpcResponse extends JsonRpcBaseMessage { id: number | string | null; result?: any; error?: JsonRpcError; }`
        *   `JsonRpcNotification extends JsonRpcBaseMessage { method: string; params?: any; }`
        *   `JsonRpcError { code: number; message: string; data?: any; }`
*   **`src/lsp/lsp_client.ts`**: This file will implement the client-side logic for specific LSP requests. It will contain functions that abstract the construction of LSP request objects (e.g., for `initialize`, `textDocument/definition`, `textDocument/references`, `callHierarchy/prepare`, `callHierarchy/incomingCalls`, `callHierarchy/outgoingCalls`) and handle their responses. It will use `lsp_manager.ts` to send these requests.
    *   **Class: `LspClient`**
        *   **Properties:**
            *   `lspManager: LspManager`
        *   **Constructor:**
            *   `constructor(lspManager: LspManager)`
        *   **Methods (wrapping `lspManager.sendRequest` and `lspManager.sendNotification`):**
            *   `initialize(params: InitializeParams): Promise<InitializeResult>`
            *   `initialized(params: InitializedParams): void`
            *   `shutdown(): Promise<void>`
            *   `exit(): void`
            *   `textDocumentDidOpen(params: DidOpenTextDocumentParams): void`
            *   `textDocumentDidChange(params: DidChangeTextDocumentParams): void`
            *   `textDocumentDidSave(params: DidSaveTextDocumentParams): void`
            *   `textDocumentDidClose(params: DidCloseTextDocumentParams): void`
            *   `getTextDocumentDefinition(params: TextDocumentPositionParams): Promise<Definition | LocationLink[] | null>`
            *   `getTextDocumentReferences(params: ReferenceParams): Promise<Location[] | null>`
            *   `prepareCallHierarchy(params: CallHierarchyPrepareParams): Promise<CallHierarchyItem[] | null>`
            *   `getIncomingCalls(params: CallHierarchyIncomingCallsParams): Promise<CallHierarchyIncomingCall[] | null>`
            *   `getOutgoingCalls(params: CallHierarchyOutgoingCallsParams): Promise<CallHierarchyOutgoingCall[] | null>`
            *   `// ... other LSP methods as needed`
*   **`src/lsp/types.ts`** (or `src/lsp/lsp_types.ts`): This file will define TypeScript interfaces and types for the various LSP message structures, parameters, and results. This will ensure type safety when working with LSP messages. (Many of these are defined by the `vscode-languageserver-protocol` package, which should be used if possible. Below are examples if defining manually or extending.)
    *   **Interfaces & Types (examples, refer to LSP specification for full details):**
        *   `InitializeParams`, `InitializeResult`, `ClientCapabilities`, `ServerCapabilities`
        *   `InitializedParams`
        *   `TextDocumentItem`, `TextDocumentIdentifier`, `VersionedTextDocumentIdentifier`
        *   `DidOpenTextDocumentParams`, `DidChangeTextDocumentParams`, `DidSaveTextDocumentParams`, `DidCloseTextDocumentParams`
        *   `TextDocumentPositionParams`, `Position { line: number, character: number }`
        *   `Location { uri: DocumentUri, range: Range }`, `Range { start: Position, end: Position }`
        *   `Definition`, `LocationLink`
        *   `ReferenceParams`, `ReferenceContext`
        *   `CallHierarchyPrepareParams`, `CallHierarchyItem`, `SymbolTag`, `SymbolKind`
        *   `CallHierarchyIncomingCallsParams`, `CallHierarchyIncomingCall`
        *   `CallHierarchyOutgoingCallsParams`, `CallHierarchyOutgoingCall`
        *   `DocumentUri = string`
        *   `LspResponse` (generic for responses from server)
        *   `LspNotification` (generic for notifications from server)
*   **`src/config/lsp_config.ts`**: This file could store configuration details for the Java LSP server, such as the command to launch it, paths to necessary JAR files, and any specific initialization options required by the server.
    *   **Interface: `JavaLspConfig`**
        *   `serverCommand: string`
        *   `serverJarPath: string`
        *   `serverArgs: string[]`
        *   `workspaceRoot?: string` // To be dynamically set or configured
        *   `initializationOptions?: any`
    *   **Object: `defaultLspConfig: JavaLspConfig`** (example default values)
*   **`src/services/call_hierarchy_service.ts`**: This higher-level service will utilize `lsp_client.ts` to perform the sequence of LSP calls needed to build a call hierarchy for a given method. It will manage the state of the recursive search and aggregate the results. Given the limitations with JDT LS's `callHierarchy/prepare` (as noted earlier), this service will also be responsible for invoking an AST parsing service (like `AstParserService` from the `java-ast` integration) to parse method bodies and refine outgoing call information, particularly by analyzing control flow.
    *   **Class: `CallHierarchyService`**
        *   **Properties:**
            *   `lspClient: LspClient`
            *   `projectRootUri: DocumentUri`
        *   **Constructor:**
            *   `constructor(lspClient: LspClient, projectRootUri: DocumentUri)`
        *   **Methods:**
            *   `getCallHierarchyForMethod(uri: DocumentUri, position: Position, maxDepth?: number): Promise<CallHierarchyNode | null>`: Main method to initiate call hierarchy construction.
            *   `private async findOutgoingCalls(item: CallHierarchyItem, currentDepth: number, maxDepth: number, visited: Set<string>): Promise<CallHierarchyNode[]>`: Recursively fetches outgoing calls.
            *   `private async findIncomingCalls(item: CallHierarchyItem, currentDepth: number, maxDepth: number, visited: Set<string>): Promise<CallHierarchyNode[]>`: (Optional, if bi-directional hierarchy is needed) Recursively fetches incoming calls.
            *   `private isWithinProject(uri: DocumentUri): boolean`: Checks if a given URI is within the current project scope to avoid tracing into external libraries/JDK.
    *   **Interface/Type: `CallHierarchyNode`**
        *   `item: CallHierarchyItem`
        *   `uri: DocumentUri`
        *   `range: Range`
        *   `name: string`
        *   `detail?: string`
        *   `kind: SymbolKind`
        *   `outgoingCalls: CallHierarchyNode[]`
        *   `incomingCalls: CallHierarchyNode[]` (Optional)

These files and their described contents provide a modular and maintainable structure for interacting with the Java LSP server from the Node.js application.

## Testing Strategy

Thorough testing is crucial for the reliability of the Java LSP interaction module. A combination of unit tests, integration tests, and potentially a few end-to-end tests will be employed.

### 1. `src/lsp/lsp_manager.ts` (`LspManager`)

*   **Unit Tests:**
    *   **Server Lifecycle:**
        *   Verify `startServer()` correctly spawns a mock child process with the configured command and arguments.
        *   Verify `startServer()` correctly sets up listeners for `stdout`, `stderr`, `error`, and `exit` events on the child process.
        *   Verify `stopServer()` sends `shutdown` and `exit` messages in the correct order via a mocked `sendNotification`.
        *   Verify `stopServer()` resolves after the mock child process exits.
        *   Test behavior if `stopServer()` is called when the server is not running.
    *   **Request/Notification Sending:**
        *   Verify `sendRequest()` correctly formats the message (using a mocked `json_rpc_protocol.formatRequestMessage`) and writes to the mock child process `stdin`.
        *   Verify `sendRequest()` correctly stores a pending promise and resolves/rejects it when a corresponding response/error is received.
        *   Verify `sendNotification()` correctly formats the message and writes to `stdin`.
        *   Test unique ID generation for requests.
    *   **Data Handling & Message Parsing:**
        *   Mock `childProcess.stdout` emitting data:
            *   Test `handleData()` with complete single messages.
            *   Test `handleData()` with chunked messages (data arriving in multiple `Buffer` chunks).
            *   Test `handleData()` with multiple messages in a single `Buffer`.
            *   Test `handleMessage()` correctly identifies responses vs. notifications.
            *   Test `handleMessage()` resolves the correct pending request for responses.
            *   Test `handleMessage()` emits notifications for notification messages via an event emitter or callback mechanism.
    *   **Error Handling:**
        *   Test handling of `stderr` output from the mock child process (e.g., logging errors).
        *   Test handling of the `error` event from the mock child process (e.g., server failed to start).
        *   Test handling of the `exit` event with non-zero exit codes.
        *   Test timeout scenarios for requests if implemented.

### 2. `src/lsp/json_rpc_protocol.ts`

*   **Unit Tests:**
    *   **`formatRequestMessage`:**
        *   Verify correct `Content-Length` header calculation for various params.
        *   Verify correct `

` separator.
        *   Verify correct JSON structure (`jsonrpc`, `id`, `method`, `params`).
    *   **`formatNotificationMessage`:**
        *   Verify correct `Content-Length` and JSON structure (no `id`).
    *   **`parseMessage`:**
        *   Test with valid request and notification message buffers.
        *   Test with buffers containing partial messages (should return null message and original buffer or remaining part).
        *   Test with buffers containing multiple messages (should parse the first and return the rest).
        *   Test with malformed headers or JSON content (error handling or graceful failure).
        *   Test with empty or insufficient buffer.

### 3. `src/lsp/lsp_client.ts` (`LspClient`)

*   **Unit Tests (using a mocked `LspManager`):**
    *   For each public method (e.g., `initialize`, `getTextDocumentDefinition`, `prepareCallHierarchy`):
        *   Verify it calls the corresponding `lspManager.sendRequest()` or `lspManager.sendNotification()` method.
        *   Verify it passes the correct LSP `method` name (e.g., "initialize", "textDocument/definition").
        *   Verify it passes the `params` object correctly structured according to LSP specifications for that method.
        *   Verify it correctly returns the promise and unwraps the `result` from the `LspManager`'s response for request methods.

### 4. `src/lsp/types.ts`

*   **Static Analysis/Type Checking:** While not runtime tests, ensure these types are heavily used throughout the LSP interaction code. Successful compilation without type errors is a primary validation.
*   **Manual Review:** Ensure definitions align with the official Language Server Protocol specification.
*   Consider creating mock objects based on these types to be used in tests for other modules, implicitly testing the type definitions.

### 5. `src/config/lsp_config.ts`

*   **Unit Tests:**
    *   Verify that `defaultLspConfig` contains sensible default values.
    *   If a function is provided to load or merge configurations, test its logic (e.g., overriding defaults with custom values).

### 6. `src/services/call_hierarchy_service.ts` (`CallHierarchyService`)

*   **Unit Tests (using a mocked `LspClient`):**
    *   **`getCallHierarchyForMethod`:**
        *   Test successful retrieval of a call hierarchy: mock `lspClient.prepareCallHierarchy` and `lspClient.getOutgoingCalls` (and `getIncomingCalls` if used) to return valid data.
        *   Verify the recursive fetching of calls up to `maxDepth`.
        *   Test scenario where `prepareCallHierarchy` returns `null` or an empty array.
        *   Test scenario where `getOutgoingCalls` returns `null` or an empty array at various levels.
        *   Test handling of errors returned by `LspClient` methods.
    *   **`isWithinProject`:**
        *   Test with URIs that are inside the `projectRootUri`.
        *   Test with URIs that are outside (e.g., JDK, external libraries).
        *   Test edge cases (e.g., URI is the same as `projectRootUri`).
    *   **Recursive Call Handling & `visited` Set:**
        *   Test that the `visited` set correctly prevents infinite loops in case of recursive method calls in the mock data.

### 7. Integration Tests

*   **`LspManager` with `json_rpc_protocol`:** Test that `LspManager` can correctly send and receive messages that are formatted and parsed by `json_rpc_protocol` functions, using a simple mock server that echoes or provides canned responses over `stdin`/`stdout`.
*   **`CallHierarchyService` with `LspClient` (and mocked `LspManager`):** Test the interaction between `CallHierarchyService` and `LspClient`, ensuring the sequence of LSP calls (`prepare`, `outgoingCalls`) is correct and data flows as expected. The `LspManager` would still be mocked here to avoid needing a real LSP server process for these specific integration tests.

### 8. End-to-End (E2E) Tests (Optional but Recommended)

*   **Full LSP Interaction:**
    *   These tests would involve spawning a *real* Java LSP server (e.g., Eclipse JDT LS) using the `LspManager`.
    *   Prepare a small, well-defined Java test project.
    *   **Scenario 1: Initialization & Document Open:**
        *   Start the LSP server.
        *   Send `initialize` and `initialized` messages.
        *   Send `textDocument/didOpen` for a Java file in the test project.
        *   Verify successful responses (or lack of errors).
    *   **Scenario 2: Call Hierarchy Retrieval:**
        *   Following Scenario 1, pick a specific method in the opened Java file.
        *   Use `CallHierarchyService` to request its call hierarchy.
        *   Verify that the returned hierarchy matches the known structure of the test Java project (e.g., correct called methods, ranges).
    *   **Scenario 3: Shutdown:**
        *   Verify the LSP server shuts down cleanly using `stopServer()`.
    *   These tests are more complex to set up and maintain but provide the highest confidence in the system. 