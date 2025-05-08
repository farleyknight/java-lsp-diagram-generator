# LLM Interaction (Claude API)

This document outlines the details for interacting with the LLM (Claude API) for disambiguation and diagram generation. 

## Overview

The Large Language Model (LLM), specifically Claude, plays a crucial role in two key phases of the application:

1.  **Endpoint Disambiguation (Step 2):** Given a user's natural language query and a list of discovered REST endpoints from the Java project, the LLM determines which specific endpoint the user is referring to.
2.  **Mermaid Diagram Generation (Step 4):** Given a structured call hierarchy graph (derived from LSP and `java-ast` analysis), the LLM generates the textual syntax for a Mermaid sequence diagram representing the request/response flow.

Effective interaction with the LLM requires careful prompt engineering, management of API communications, and robust error handling.

## API Interaction with Claude

Interaction with the Claude API will be managed through HTTPS requests.

### 1. API Key Management
*   **Requirement:** A valid Anthropic API key is necessary.
*   **Storage:** The API key is expected to be stored in an `.env` file in the project root, like so: `ANTHROPIC_API_KEY=your_key_here`.
*   **Access:** The application will load this key at runtime to authenticate API requests. Access to this key must be secured.

### 2. Request/Response Structure
*   **Requests:** HTTP POST requests will be made to the relevant Claude API endpoint. The body will be JSON, containing the prompt and other parameters (e.g., model version, max tokens).
*   **Responses:** The API will return JSON responses. Successful responses will contain the LLM-generated text (e.g., the disambiguated choice or the Mermaid diagram syntax).
*   **Headers:** Requests must include appropriate headers, such as `Content-Type: application/json` and the API key header (e.g., `x-api-key`).

### 3. Error Handling
*   **Network Errors:** Handle potential network issues (timeouts, DNS failures) when making API calls.
*   **API Errors:** Implement logic to process HTTP error codes from the Claude API (e.g., 400 for bad requests, 401 for authentication issues, 429 for rate limits, 500 for server errors).
*   **Rate Limiting:** Be mindful of API rate limits. Implement retry mechanisms with exponential backoff if appropriate.
*   **Content Filtering:** The API might return errors or warnings related to content filtering. This needs to be handled gracefully.

## Prompt Engineering

The quality of the LLM's output heavily depends on the quality of the prompts.

### 1. Endpoint Disambiguation Prompt
*   **Goal:** To have the LLM identify the most relevant REST endpoint from a list, based on a user's query.
*   **Inputs to the Prompt:**
    *   The user's natural language query (e.g., "generate a diagram for the user login endpoint").
    *   A structured list of discovered REST endpoints. Each endpoint entry should include:
        *   File path
        *   Class name
        *   Method name
        *   HTTP method(s)
        *   Endpoint path/pattern
        *   Relevant comments or JavaDocs.
*   **Instructions for the LLM:**
    *   Clearly state the task: "From the following list of Java REST endpoints, identify the one that best matches the user's query."
    *   Provide the user's query.
    *   Provide the list of endpoints in a clear, structured format (e.g., JSON within the prompt, or a numbered list).
    *   Ask the LLM to explain its choice or provide a confidence score if possible.
    *   Specify the desired output format (e.g., the ID or unique identifier of the chosen endpoint).
*   **Example Prompt Snippet:**
    ```
    User Query: "Show me the API for creating new products."

    Available Endpoints:
    1.  ID: endpoint_001
        Class: ProductController
        Method: getProductById(String id)
        Path: /api/products/{id}
        HTTP Method: GET
        Docs: Retrieves a product by its unique identifier.
    2.  ID: endpoint_002
        Class: ProductController
        Method: createProduct(ProductDetails product)
        Path: /api/products
        HTTP Method: POST
        Docs: Creates a new product entry.
    ...

    Based on the user query, which endpoint ID is the most relevant?
    ```

### 2. Mermaid Diagram Generation Prompt
*   **Goal:** To have the LLM generate Mermaid sequence diagram syntax from a call hierarchy graph.
*   **Inputs to the Prompt:**
    *   The structured call hierarchy graph (from Step 3). This graph includes nodes (methods) and edges (calls), potentially with conditions.
        *   Example Node: `{ "id": "com.example.UserService.getUser", "class": "UserService", "method": "getUser(String id)" }`
        *   Example Edge: `{ "callerId": "com.example.UserController.getUserById", "calleeId": "com.example.UserService.getUser", "condition": "if (userIsAuthenticated)" }`
    *   Details of the initial REST endpoint (e.g., HTTP method, path).
*   **Instructions for the LLM:**
    *   Clearly state the task: "Generate a Mermaid sequence diagram based on the following call hierarchy."
    *   Specify the entry point (the initial REST endpoint).
    *   Provide the call hierarchy data in a structured format (e.g., JSON).
    *   Instruct the LLM on how to map graph elements to diagram elements:
        *   Participants should be classes.
        *   Method calls between classes should be represented as messages.
        *   Incorporate conditional logic (e.g., `alt`, `opt` blocks in Mermaid) based on the "condition" fields in the call graph edges.
        *   The diagram should start with an "Actor" or "User" initiating the request to the REST endpoint.
        *   Clearly show request flow and any response propagation if inferable.
*   **Example Prompt Snippet:**
    ```
    Generate a Mermaid sequence diagram for a GET /api/orders/{id} request.
    The entry point is the method `OrderController.getOrderById(String id)`.
    Participants in the diagram should be the classes involved.
    Use 'alt' blocks for conditional calls.

    Call Hierarchy Data:
    {
      "nodes": [
        { "id": "Actor", "class": "Actor", "method": "" },
        { "id": "com.example.OrderController.getOrderById", "class": "OrderController", "method": "getOrderById(String id)" },
        { "id": "com.example.OrderService.fetchOrder", "class": "OrderService", "method": "fetchOrder(String id)" }
      ],
      "edges": [
        { "callerId": "Actor", "calleeId": "com.example.OrderController.getOrderById", "label": "GET /api/orders/{id}" },
        { "callerId": "com.example.OrderController.getOrderById", "calleeId": "com.example.OrderService.fetchOrder" }
      ]
    }

    Mermaid Diagram:
    ```

## Key Files and Their Roles (TypeScript)

We anticipate the following key files for managing LLM interactions:

*   **`src/llm/claude_service.ts`** (or `llm_service.ts`): This class will encapsulate the logic for communicating with the Claude API.
    *   **Class: `ClaudeService`**
        *   **Properties:**
            *   `private apiKey: string`
            *   `private apiClient: HttpClient` // An abstraction for making HTTP requests (e.g., using axios or node-fetch)
        *   **Constructor:**
            *   `constructor(apiKey: string)`: Initializes with the API key.
        *   **Methods:**
            *   `async disambiguateEndpoint(userQuery: string, endpoints: DiscoveredEndpoint[]): Promise<DisambiguationResult>`:
                *   Constructs the prompt using `PromptBuilder.buildDisambiguationPrompt()`.
                *   Sends the request to the Claude API.
                *   Parses the response to extract the chosen endpoint or ambiguity information.
                *   Handles API errors.
            *   `async generateMermaidDiagram(hierarchy: CallHierarchyGraph, endpointDetails: EndpointDetails): Promise<string>`:
                *   Constructs the prompt using `PromptBuilder.buildDiagramGenerationPrompt()`.
                *   Sends the request to the Claude API.
                *   Parses the response to extract the Mermaid syntax string.
                *   Handles API errors.
            *   `private async makeApiCall(prompt: string, params: ApiParams): Promise<ApiResponse>`: Low-level method to make the actual HTTP call.
*   **`src/llm/prompt_builder.ts`**: This module will contain utility functions for constructing the detailed prompts sent to Claude.
    *   **Functions:**
        *   `buildDisambiguationPrompt(userQuery: string, endpoints: DiscoveredEndpoint[]): string`: Generates the full text prompt for endpoint disambiguation.
        *   `buildDiagramGenerationPrompt(hierarchy: CallHierarchyGraph, endpointDetails: EndpointDetails): string`: Generates the full text prompt for Mermaid diagram generation.
*   **`src/llm/llm_types.ts`**: This file will define TypeScript interfaces for the data structures related to LLM interaction.
    *   **Interfaces:**
        *   `DiscoveredEndpoint`: (As defined in `project_overview.md` or a shared types file)
            *   `filePath: string`
            *   `className: string`
            *   `methodName: string`
            *   `httpMethods: string[]`
            *   `endpointPath: string`
            *   `docs?: string` // Comments or JavaDocs
            *   `id: string` // A unique identifier for the endpoint
        *   `DisambiguationChoice { endpointId: string; confidence?: number; reasoning?: string; }`
        *   `DisambiguationResult { bestMatch?: DisambiguationChoice; alternatives?: DisambiguationChoice[]; needsUserClarification: boolean; }`
        *   `CallHierarchyGraph`: (As defined in `project_overview.md` or a shared types file)
            *   `nodes: Array<{ id: string; class: string; method: string; [key: string]: any }>`
            *   `edges: Array<{ callerId: string; calleeId: string; condition?: string; label?: string }>`
        *   `EndpointDetails`: Information about the specific REST endpoint being diagrammed.
            *   `httpMethod: string`
            *   `path: string`
            *   `entryClass: string`
            *   `entryMethod: string`
        *   `ApiParams`: Parameters for the Claude API call (e.g., model, max_tokens_to_sample).
        *   `ApiResponse`: Structure of the expected response from Claude.

## Testing Strategy

*   **`src/llm/claude_service.ts` (`ClaudeService`):**
    *   **Unit Tests (mocking HTTP client):**
        *   Test `disambiguateEndpoint()`:
            *   Verify correct prompt is generated (by checking input to mocked `PromptBuilder`).
            *   Mock successful API response and verify correct parsing of `DisambiguationResult`.
            *   Mock API error responses (4xx, 5xx) and verify error handling.
            *   Mock scenarios where LLM indicates ambiguity or low confidence.
        *   Test `generateMermaidDiagram()`:
            *   Verify correct prompt generation.
            *   Mock successful API response and verify correct extraction of Mermaid string.
            *   Mock API error responses.
        *   Test API key handling (ensure it's being used by the mocked HTTP client).
*   **`src/llm/prompt_builder.ts`:**
    *   **Unit Tests:**
        *   For `buildDisambiguationPrompt()`:
            *   Test with various user queries and endpoint lists.
            *   Verify all necessary information is included in the prompt in the correct format.
            *   Test edge cases (e.g., empty endpoint list).
        *   For `buildDiagramGenerationPrompt()`:
            *   Test with different call hierarchy structures (simple, with conditions, multiple participants).
            *   Verify correct formatting of the hierarchy data within the prompt.
            *   Ensure instructions for Mermaid generation are clear.
*   **`src/llm/llm_types.ts`:**
    *   **Static Analysis/Type Checking:** Ensure these types are used consistently. Successful compilation is a key validation.
    *   Create mock objects based on these types for use in other tests.
*   **Integration Tests (Limited & Controlled):**
    *   Consider a very small number of tests that *actually* call the Claude API with pre-defined, simple prompts.
    *   These tests should be clearly marked and potentially run separately due to cost, flakiness, and dependency on external service.
    *   Focus on verifying basic connectivity and the overall request/response flow with the live API for a "happy path" scenario for both disambiguation and diagram generation.
    *   Strictly manage API key usage for these tests. 