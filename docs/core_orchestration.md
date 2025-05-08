# Core Orchestration & Data Flow

This document outlines the core logic for orchestrating the different components and managing the data flow through the application. 

## Overview

The core orchestration logic is responsible for managing the end-to-end process of generating a sequence diagram from a user's request. It acts as the central coordinator, invoking various services (`JavaAstRunner`, `AstParserService`, `LspManager`, `CallHierarchyService`, `ClaudeService`) in the correct sequence and managing the data as it transforms through each step outlined in `project_overview.md`.

This orchestration primarily resides within the Express.js backend, triggered by API calls from the Vue.js frontend. Its main responsibilities include:

1.  **Workflow Management:** Executing Steps 0 through 4 in the defined order.
2.  **Data Handling:** Passing data between services, ensuring correct formats and transformations.
3.  **State Management:** Keeping track of the current state of a user's request, especially for multi-stage processes like disambiguation.
4.  **Error Aggregation & Reporting:** Catching errors from any service and reporting them back to the user in a consistent way.

## Orchestration Workflow

The primary workflow is initiated by a request to an Express API endpoint (e.g., `/api/diagram/generate` as described in `docs/web_ui_interaction.md`).

**Input:** User-provided Java project path and a natural language query for a REST endpoint.

**Steps:**

1.  **Input Validation (Controller Level):**
    *   Validate the presence and basic format of `projectPath` and `query`.
    *   Check if `projectPath` is accessible (basic existence check, more thorough checks by LSP later).

2.  **Step 1: Discovery of REST Endpoints**
    *   **Action:** Invoke `JavaAstRunner` to parse all `.java` files in the `projectPath` (or relevant subdirectories).
    *   **Sub-Action:** Use `AstParserService` to traverse the ASTs and extract all REST annotations and their metadata.
    *   **Data Output:** A structured list of `DiscoveredEndpoint` objects.
    *   **Error Handling:** Catch errors from `java-ast` execution or AST parsing. Report to user.

3.  **Step 2: Disambiguation**
    *   **Action:** Invoke `ClaudeService.disambiguateEndpoint()` with the user's `query` and the `DiscoveredEndpoint[]` list.
    *   **Data Output:** A `DisambiguationResult` object, which might contain:
        *   A single, high-confidence `endpointId`.
        *   A list of potential `endpointId` choices if ambiguous.
        *   A flag `needsUserClarification`.
    *   **Conditional Flow:**
        *   **If `needsUserClarification` is true:** Return the choices to the frontend. The orchestration pauses here for this request, awaiting user selection via a separate API call (e.g., `/api/project/disambiguate`).
        *   **If a single endpoint is identified:** Proceed to Step 3 with the chosen `endpointId`.
    *   **Error Handling:** Catch errors from the LLM API call. Report to user.

4.  **Step 3: Call Hierarchy Generation**
    *   **Pre-requisite:** A single, specific `DiscoveredEndpoint` object is now selected (either directly from disambiguation or after user choice).
    *   **Action (LSP):**
        *   Initialize `LspManager` for the given `projectPath`.
        *   Use `CallHierarchyService.getCallHierarchyForMethod()`: Provide the file URI and position of the selected endpoint method. This service will use `LspClient` to perform `textDocument/definition`, `callHierarchy/prepare`, and recursively `callHierarchy/outgoingCalls` (filtered to stay within project source).
    *   **Data Output (LSP):** An initial call hierarchy graph (nodes are methods, edges are calls).
    *   **Action (`java-ast` Refinement):**
        *   For each method in the LSP-generated call hierarchy that is within the project:
            *   Invoke `JavaAstRunner.parseFile()` for the method's source file.
            *   Use `AstParserService.extractControlFlowDetails()` on the specific method node within the AST.
            *   Merge the control flow information (conditional calls) into the call hierarchy graph, annotating edges with conditions.
    *   **Data Output (Refined):** A comprehensive call hierarchy graph (`CallHierarchyGraph`) including control flow information.
    *   **Error Handling:** Catch errors from LSP interaction, `java-ast` parsing for refinement, or graph construction. Report to user. Ensure `LspManager` is properly shut down.

5.  **Step 4: Generate Mermaid Sequence Diagram**
    *   **Action:** Invoke `ClaudeService.generateMermaidDiagram()` with the refined `CallHierarchyGraph` and details of the initial REST endpoint.
    *   **Data Output:** A string containing the Mermaid sequence diagram syntax.
    *   **Error Handling:** Catch errors from the LLM API call. Report to user.

6.  **Response to Client:**
    *   Return the Mermaid syntax string to the frontend for rendering.
    *   If any step failed irrecoverably, return an appropriate error message and status code.

## Data Management and Transformation

*   **`DiscoveredEndpoint` List:** From `AstParserService` to `ClaudeService` for disambiguation.
*   **Selected `DiscoveredEndpoint`:** The chosen endpoint object (or its ID) is the key input for `CallHierarchyService`.
*   **`CallHierarchyGraph`:**
    *   Initially created by `CallHierarchyService` (LSP).
    *   Augmented with control flow data from `AstParserService` (`java-ast`).
    *   Finalized graph is input to `ClaudeService` for diagram generation.
*   **Mermaid Syntax String:** Output of `ClaudeService`, passed to the client.

## Session/State Management (for Disambiguation)

If disambiguation requires user interaction, the backend needs to manage the state of the request temporarily:
*   **Option 1: Client-Side State:** The client holds the `projectPath`, original `query`, and the `DiscoveredEndpoint[]` list. When the user makes a selection, the client sends all this context back along with the `selectedEndpointId`.
    *   **Pros:** Simpler backend, stateless.
    *   **Cons:** Larger payloads from client for the disambiguation call; client must manage this state.
*   **Option 2: Server-Side Session/Cache:**
    *   Store the intermediate data (project path, query, discovered endpoints list) on the server, associated with a temporary session ID or job ID.
    *   Return this ID to the client.
    *   Client sends back the ID and the `selectedEndpointId`.
    *   **Pros:** Smaller client payloads for disambiguation; backend controls the context.
    *   **Cons:** Requires server-side storage (e.g., in-memory cache like Redis, or a simple object for short-lived data if not scaling extensively). Needs cleanup mechanism for stale data.

Given the nature of the application (single user likely processing one request at a time), a lightweight server-side cache or even re-passing essential context from the client might be sufficient initially.

## Key Files and Their Roles (TypeScript - Backend)

*   **`server/controllers/diagramController.ts` (or similar):**
    *   Handles incoming API requests (e.g., `/api/diagram/generate`, `/api/project/disambiguate`).
    *   Responsible for initiating and managing the overall orchestration workflow for a given request.
    *   Calls the various services in sequence.
    *   Manages data flow between service calls.
    *   Formats responses (success or error) to the client.
    *   **Key Methods:** `handleGenerateDiagramRequest()`, `handleDisambiguationSelectionRequest()`.
*   **`server/services/orchestrationService.ts` (Optional Abstraction):**
    *   If `diagramController.ts` becomes too complex, the core orchestration logic can be moved into this dedicated service.
    *   The controller would then primarily handle HTTP request/response aspects and delegate the workflow execution to `OrchestrationService`.
    *   **Class: `OrchestrationService`**
        *   **Constructor:** Injects dependencies to other services (`JavaAstService`, `LspService`, `ClaudeLlmService`).
        *   **Methods:**
            *   `async processDiagramGeneration(projectPath: string, query: string): Promise<OrchestrationResult>`
            *   `async continueWithSelectedEndpoint(context: DisambiguationContext, selectedEndpointId: string): Promise<MermaidOutput>`
*   **Shared Type Definitions (`src/types/` or `shared/types/`):**
    *   `DiscoveredEndpoint`, `CallHierarchyGraph`, `DisambiguationResult`, etc., should be clearly defined and used consistently across services.

## Error Handling Strategy

*   **Service-Level Errors:** Each individual service (`JavaAstRunner`, `LspManager`, `ClaudeService`) should handle its own specific errors (e.g., process failures, API errors, parsing errors) and either throw custom, typed errors or return error objects.
*   **Orchestration-Level Error Handling (`diagramController.ts` or `OrchestrationService`):**
    *   Use `try-catch` blocks around calls to each service.
    *   Map service-specific errors to user-friendly error messages.
    *   Log detailed errors for debugging purposes.
    *   Decide if an error is recoverable or if the process should terminate.
    *   Ensure graceful cleanup if needed (e.g., shutting down LSP server if it was started).
    *   Return consistent error responses to the client (e.g., a JSON object with an `error` field and appropriate HTTP status code).

## Testing Strategy

*   **`server/controllers/diagramController.ts` (or `OrchestrationService`):**
    *   **Unit Tests / Integration Tests (with Mocks):**
        *   These are crucial for verifying the orchestration logic.
        *   Mock all underlying services (`JavaAstService`, `LspService`, `ClaudeService`).
        *   **Test Scenarios:**
            *   **Happy Path (Direct):** Mock services to return successful data at each step, leading directly to Mermaid syntax generation. Verify correct sequence of calls and data transformations.
            *   **Happy Path (with Disambiguation):**
                *   Mock `ClaudeService.disambiguateEndpoint` to return `needsUserClarification: true` and choices.
                *   Verify the controller/service returns these choices correctly.
                *   Separately test the handler for user selection (e.g., `handleDisambiguationSelectionRequest`), providing mocked context and selected ID, and verify it proceeds correctly through subsequent steps.
            *   **Error Scenarios:**
                *   Mock each service, one at a time, to throw an error at different stages of the workflow (e.g., `java-ast` fails, LSP fails, LLM fails).
                *   Verify that the error is caught, logged appropriately, and a user-friendly error response is generated.
                *   Verify any cleanup logic (e.g., LSP shutdown) is called in case of errors after LSP start.
        *   Check correct data passing between mocked service calls.

This centralized orchestration is key to the application's functionality. Robust error handling and clear data flow management are paramount. 