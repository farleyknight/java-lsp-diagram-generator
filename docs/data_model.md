# Data Model

This document serves as a centralized reference for the major data structures used throughout the Java LSP Diagram Generator application. Consistent use of these models is crucial for interoperability between different modules (AST parsing, LSP interaction, LLM services, core orchestration, and UI).

## Core Data Structures

### 1. `DiscoveredEndpoint`

Represents a REST endpoint identified by parsing Java source files (`java-ast`).

*   **Source:** `java_ast_integration.md`, `llm_interaction.md`
*   **Fields:**
    *   `id: string` - A unique identifier for the endpoint (e.g., generated hash or sequential ID).
    *   `filePath: string` - Absolute or relative path to the Java file containing the endpoint definition.
    *   `className: string` - Name of the class containing the endpoint method.
    *   `methodName: string` - Name of the method implementing the endpoint.
    *   `httpMethods: string[]` - Array of HTTP methods supported by the endpoint (e.g., `["GET"]`, `["POST"]`).
    *   `endpointPath: string` - The URL path pattern for the endpoint (e.g., `/api/users/{id}`).
    *   `lineNumber: number` - Starting line number of the method definition in the source file.
    *   `classAnnotations?: string[]` - Optional: Annotations at the class level relevant to REST.
    *   `methodAnnotations?: string[]` - Optional: Annotations at the method level relevant to REST.
    *   `parameters?: Array<{ name: string; type: string; annotations?: string[] }>` - Optional: List of method parameters.
    *   `docs?: string` - Optional: Extracted JavaDoc comments or other relevant documentation for the endpoint.

### 2. `DisambiguationChoice`

Represents a single choice provided to the user or selected by the LLM during endpoint disambiguation.

*   **Source:** `llm_interaction.md`
*   **Fields:**
    *   `endpointId: string` - The `id` of the `DiscoveredEndpoint` that this choice refers to.
    *   `description: string` - A human-readable description of the endpoint (e.g., "GET /api/users/{id} - UserController.getUserById"), often generated for UI display.
    *   `confidence?: number` - Optional: A score (e.g., 0.0 to 1.0) indicating the LLM's confidence in this choice.
    *   `reasoning?: string` - Optional: The LLM's explanation for this choice.

### 3. `DisambiguationResult`

Represents the outcome of the endpoint disambiguation process performed by the LLM.

*   **Source:** `llm_interaction.md`, `core_orchestration.md`
*   **Fields:**
    *   `bestMatch?: DisambiguationChoice` - The highest confidence match if one is found.
    *   `alternatives?: DisambiguationChoice[]` - A list of other potential matches if the primary match is not clear or if multiple good candidates exist.
    *   `needsUserClarification: boolean` - A flag indicating whether user input is required to select the correct endpoint. True if `bestMatch` is undefined or has low confidence, or if `alternatives` are present.
    *   `originalQuery: string` - The user's original natural language query.
    *   `discoveredEndpointsSnapshot?: DiscoveredEndpoint[]` - Optional: A snapshot of the endpoints list sent for disambiguation, for context.

### 4. `CallHierarchyNodeLSP` (LSP-Specific Node)

Represents a node in the call hierarchy as directly returned by the LSP, before further refinement.

*   **Source:** Based on `java_lsp.md` (`CallHierarchyItem` from LSP specification)
*   **Fields:** (Aligns with LSP `CallHierarchyItem` structure)
    *   `name: string` - The name of the symbol (e.g., method name).
    *   `kind: SymbolKind` (number) - The kind of symbol (e.g., Method, Function).
    *   `tags?: SymbolTag[]` (number[]) - Additional tags.
    *   `detail?: string` - More detail for this item, e.g., a signature.
    *   `uri: DocumentUri` (string) - The URI of the document where this item is defined.
    *   `range: Range` - The range enclosing this symbol.
    *   `selectionRange: Range` - The range that should be selected and revealed when this item is selected.
    *   `data?: any` - Optional: A data field that is preserved between a `callHierarchy/prepare` and `callHierarchy/incomingCalls` or `callHierarchy/outgoingCalls` requests.

### 5. `CallHierarchyEdge`

Represents a call (an edge) between two methods in the call hierarchy.

*   **Source:** `project_overview.md`, `llm_interaction.md`
*   **Fields:**
    *   `callerId: string` - Unique ID of the calling method/node.
    *   `calleeId: string` - Unique ID of the called method/node.
    *   `condition?: string` - Optional: A textual description of the condition under which this call is made (e.g., "if (userIsAuthenticated)"), derived from `java-ast` control flow analysis.
    *   `label?: string` - Optional: A label for the call, could be the method signature or a simplified name.
    *   `callSiteLineNumber?: number` - Optional: Line number in the caller's source code where the call occurs.

### 6. `MethodNode` (Refined Call Hierarchy Node)

Represents a method (a node) in the refined call hierarchy graph. This structure combines information from LSP and `java-ast`.

*   **Source:** Combination of `project_overview.md`, `llm_interaction.md`, `java_lsp.md` (`CallHierarchyNode` interface)
*   **Fields:**
    *   `id: string` - Unique identifier for this method node (e.g., fully qualified method name or a generated ID).
    *   `className: string` - Name of the class.
    *   `methodName: string` - Name of the method.
    *   `signature?: string` - Method signature (e.g., `getUser(String id)`).
    *   `uri: DocumentUri` (string) - The URI of the document where this method is defined.
    *   `range: Range` - The range enclosing this method in the source code.
    *   `lspItem?: CallHierarchyNodeLSP` - Optional: The original LSP item if available.
    *   `isExternal: boolean` - Flag indicating if the method is outside the project's source code (e.g., JDK or external library).

### 7. `CallHierarchyGraph`

Represents the complete call hierarchy, including nodes (methods) and edges (calls with conditions), ready for LLM processing or visualization.

*   **Source:** `project_overview.md`, `llm_interaction.md`, `core_orchestration.md`
*   **Fields:**
    *   `entryPointId: string` - The `id` of the `MethodNode` that serves as the entry point of this graph (typically the REST endpoint method).
    *   `nodes: MethodNode[]` - An array of all method nodes in the graph.
    *   `edges: CallHierarchyEdge[]` - An array of all call edges connecting the nodes.
    *   `metadata?: any` - Optional: Any additional metadata about the graph (e.g., project path, query it was generated for).

### 8. `ControlFlowInfo`

Represents control flow details extracted from a method's body using `java-ast`.

*   **Source:** `java_ast_integration.md`
*   **Fields:**
    *   `conditionalCalls: Array<{ condition: string; methodName: string; targetClass?: string; callSiteLineNumber: number }>` - List of calls made under specific conditions.
    *   `methodId: string` - The ID of the method this control flow information pertains to.

### 9. `EndpointDetails`

Represents contextual information about the specific REST endpoint being processed for diagram generation. This is often derived from a `DiscoveredEndpoint` and passed to the LLM.

*   **Source:** `llm_interaction.md`
*   **Fields:**
    *   `endpointId: string` - The unique ID of the `DiscoveredEndpoint` this refers to.
    *   `httpMethod: string` - The HTTP method of the endpoint (e.g., "GET", "POST").
    *   `path: string` - The URL path pattern of the endpoint.
    *   `entryClassName: string` - The name of the class containing the endpoint method.
    *   `entryMethodName: string` - The name of the method implementing the endpoint.
    *   `entryMethodSignature?: string` - Optional: The signature of the entry method.

## UI-Specific Structures

### 10. `MermaidDiagram`

Represents the generated Mermaid diagram ready for the UI.

*   **Source:** `web_ui_interaction.md`, `mermaid_diagram_management.md`
*   **Fields:**
    *   `syntax: string` - The raw Mermaid syntax string generated by the LLM.
    *   `title?: string` - Optional: A title for the diagram (e.g., derived from the user query).
    *   `generationTimestamp: Date` - Timestamp of when the diagram was generated.

## Configuration Structures

Refer to individual module documentation for specific configuration object structures (e.g., `JavaLspConfig` in `java_lsp.md`, `JavaAstConfig` in `java_ast_integration.md`). The `.env` file structure is outlined in `deployment_and_setup.md`.

## Notes

*   `Range` and `Position` types are standard LSP types: `Position { line: number, character: number }`, `Range { start: Position, end: Position }`.
    Standard Language Server Protocol types (e.g., `InitializeParams`, `TextDocumentDefinitionParams`, `CallHierarchyItem`, `SymbolKind`, `SymbolTag`, etc., and their corresponding results) will be used for LSP communication, ideally sourced from a library like `vscode-languageserver-protocol`. The `CallHierarchyNodeLSP` structure is based on the LSP's `CallHierarchyItem`.
*   `DocumentUri` is typically a string representing a file URI.
*   `SymbolKind` and `SymbolTag` are LSP-defined enums (numeric values).
*   This document is a living specification and may be updated as the project evolves. 