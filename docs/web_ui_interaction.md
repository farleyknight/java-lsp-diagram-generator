# Web UI & User Interaction (Express & Vue)

This document outlines the design and implementation details for the Web UI (Express & Vue) and user interaction flows. 

## Overview

The Web User Interface (UI) is the primary means by which the user interacts with the application. It is composed of a Vue.js single-page application (SPA) for the frontend and an Express.js server for the backend API and orchestration.

The UI will guide the user through the following main steps:
1.  **Project Input (Step 0):** Allow the user to specify the path to their Java project.
2.  **Endpoint Query (Step 0):** Allow the user to enter a natural language query for the desired REST endpoint.
3.  **Disambiguation (Step 2):** If multiple endpoints match the query, present these options to the user for selection.
4.  **Diagram Display (Step 4):** Render the generated Mermaid sequence diagram.

## Backend (Express.js)

The Express.js application will serve as the backend API for the Vue.js frontend. It will also orchestrate the calls to the various services (`LspManager`, `ClaudeService`, `JavaAstRunner`).

### 1. API Endpoints

Key API endpoints will include:
*   **`POST /api/project/analyze`**: (Or a more descriptive name like `/api/diagram/generate`)
    *   **Request Body:**
        ```json
        {
          "projectPath": "/path/to/user/java-project",
          "query": "generate a diagram for the user login endpoint"
        }
        ```
    *   **Processing:** This endpoint will trigger the entire workflow:
        1.  Validate `projectPath`.
        2.  Invoke `JavaAstRunner` and `AstParserService` to discover all REST endpoints (Step 1).
        3.  Invoke `ClaudeService.disambiguateEndpoint()` with the user query and discovered endpoints (Step 2).
        4.  If disambiguation requires user input, return a list of choices to the frontend.
        5.  (If disambiguation is clear or after user selection - see below) Invoke `LspManager` and `CallHierarchyService` to get the call hierarchy for the selected endpoint (Step 3).
        6.  Refine call hierarchy with `JavaAstRunner` and `AstParserService` for control flow (Step 3).
        7.  Invoke `ClaudeService.generateMermaidDiagram()` with the call hierarchy (Step 4).
        8.  Return the Mermaid diagram syntax or an error.
    *   **Response Body (Success - Diagram):**
        ```json
        {
          "mermaidSyntax": "sequenceDiagram\nActor->>User API: Request\n..."
        }
        ```
    *   **Response Body (Success - Needs Disambiguation):**
        ```json
        {
          "disambiguationRequired": true,
          "choices": [
            { "id": "endpoint_001", "description": "GET /api/users/{id} - UserController.getUserById" },
            { "id": "endpoint_002", "description": "POST /api/users - UserController.createUser" }
          ]
        }
        ```
*   **`POST /api/project/disambiguate`**: (If disambiguation is handled as a separate step after user selection)
    *   **Request Body:**
        ```json
        {
          "projectPath": "/path/to/user/java-project", // Or a session/job ID to retrieve context
          "selectedEndpointId": "endpoint_001"
        }
        ```
    *   **Processing:** This endpoint would be called if the previous call indicated `disambiguationRequired`.
        1.  Retrieve the context (e.g., previously discovered endpoints, original query).
        2.  Proceed from Step 3 (Call Hierarchy) using the `selectedEndpointId`.
        3.  Return the Mermaid diagram syntax.
    *   **Response Body (Success - Diagram):** (Same as above)

### 2. Serving Frontend Assets
*   The Express server will also be responsible for serving the static assets (HTML, CSS, JavaScript) of the compiled Vue.js application.
*   A catch-all route can direct all non-API requests to the Vue app's `index.html` to enable client-side routing.

### 3. Configuration
*   Manage configurations for paths to Java, `java-ast.jar`, LSP server, and API keys (e.g., via `.env` files).

## Frontend (Vue.js)

The Vue.js application will provide a reactive and user-friendly interface.

### 1. Key Components
*   **`ProjectInputForm.vue`:**
    *   Input field for the Java project path.
    *   Input field (textarea) for the natural language query.
    *   Submit button to trigger the analysis.
*   **`EndpointDisambiguation.vue`:**
    *   Displays a list of possible endpoint matches when the backend requires disambiguation.
    *   Allows the user to select one endpoint.
    *   Submit button to send the selection back to the backend.
*   **`DiagramDisplay.vue`:**
    *   Renders the Mermaid sequence diagram using a library like `vue-mermaid-string` or by directly integrating `mermaid.js`.
    *   Provides options like "Copy to Clipboard" for the diagram syntax or potentially "Download as SVG/PNG".
*   **`App.vue` (Main Application Component):**
    *   Manages the overall application state (e.g., current step, loading status, error messages).
    *   Orchestrates the display of other components based on the application state.
*   **`LoadingIndicator.vue`:** Displays a visual cue during long-running backend operations.
*   **`ErrorMessage.vue`:** Displays error messages from the backend or client-side issues.

### 2. State Management
*   For a simple application, Vue's built-in reactivity might suffice.
*   For more complex state (e.g., managing intermediate results, user session data), consider Pinia (the official Vue state management library).
*   State to manage:
    *   Project path
    *   User query
    *   List of discovered endpoints (if needed on client)
    *   Disambiguation choices
    *   Selected endpoint
    *   Generated Mermaid syntax
    *   Loading status
    *   Error messages

### 3. API Communication
*   Use a library like `axios` to make HTTP requests to the Express backend.
*   Implement services or composables in Vue to encapsulate API call logic.
    *   Example: `apiService.js` with functions like `generateDiagram(projectPath, query)` and `submitDisambiguationChoice(selectedEndpointId, context)`. 

### 4. Routing (Optional but Recommended)
*   If the application grows, `vue-router` can manage different views (e.g., a dedicated page for results, a history page).
*   For the described flow, client-side routing might be minimal initially, with component visibility managed by state.

## User Interaction Flow

1.  User opens the web application.
2.  User enters the Java project path and their natural language query into `ProjectInputForm.vue`.
3.  User clicks "Generate Diagram". A loading indicator is shown.
4.  The frontend sends a `POST` request to `/api/project/analyze`.
5.  **Scenario A: Direct Result**
    *   Backend processes everything and returns the Mermaid syntax.
    *   Frontend receives the syntax, hides the loading indicator, and `DiagramDisplay.vue` renders the diagram.
6.  **Scenario B: Disambiguation Needed**
    *   Backend returns a list of choices (`disambiguationRequired: true`).
    *   Frontend hides the loading indicator, displays `EndpointDisambiguation.vue` with the choices.
    *   User selects an endpoint and clicks "Confirm". A loading indicator is shown.
    *   Frontend sends a `POST` request to `/api/project/disambiguate` (or back to `/api/project/analyze` with selection).
    *   Backend processes from Step 3 onwards and returns the Mermaid syntax.
    *   Frontend receives the syntax, hides the loading indicator, and `DiagramDisplay.vue` renders the diagram.
7.  If any step fails, an error message is displayed via `ErrorMessage.vue`.

## Key Files and Their Roles (Illustrative Structure)

**Backend (Express.js) - `server/` directory:**
*   `server/index.ts`: Main Express application setup, middleware, starts the server.
*   `server/routes/api.ts`: Defines API routes (e.g., `/project/analyze`).
*   `server/controllers/diagramController.ts`: Handles logic for diagram generation requests, orchestrates service calls.
*   `server/services/`: Contains backend services that might wrap or coordinate calls to `LspManager`, `ClaudeService`, etc. (This might overlap with `core_orchestration.md` logic).
*   `server/config.ts`: Backend configuration.

**Frontend (Vue.js) - `client/` or `src/` directory (assuming Vue CLI/Vite setup):**
*   `client/src/main.ts`: Vue app initialization.
*   `client/src/App.vue`: Root Vue component.
*   `client/src/components/`: Directory for Vue components (`ProjectInputForm.vue`, `DiagramDisplay.vue`, etc.).
*   `client/src/services/apiService.ts`: Client-side service for making API calls.
*   `client/src/store/` (if using Pinia): State management modules.
*   `client/src/router/` (if using `vue-router`): Route definitions.

## Security Considerations

When handling user inputs, especially file paths and interactions with external processes like the LSP server and `java-ast`, security is paramount.

*   **Input Validation (Project Path):**
    *   The `projectPath` provided by the user must be rigorously validated on the backend.
    *   **Risk:** Path traversal attacks (e.g., `../../../../../etc/passwd`) if the path is used directly in file system operations or passed to shell commands without sanitization.
    *   **Mitigation:**
        *   Normalize the path (e.g., using `path.resolve()` or `path.normalize()`).
        *   Ensure the resolved path is within an expected base directory or adheres to a strict allowlist of accessible directories if the application is multi-tenant or hosted.
        *   Check for and reject suspicious path components (e.g., `..`, symbolic links that might point outside allowed areas if applicable).
        *   The application should operate with the minimum necessary file system permissions.

*   **Interaction with `java-ast` and LSP Server:**
    *   **Risk:** If file paths or other parameters passed to `java-ast` or the LSP server are not properly sanitized, it could lead to command injection vulnerabilities, allowing an attacker to execute arbitrary commands on the server.
    *   **Mitigation:**
        *   Always use `child_process.spawn()` with an array of arguments rather than `child_process.exec()` with a command string constructed from user input. This prevents shell interpretation of arguments.
        *   Validate and sanitize any user-provided data that forms part of arguments passed to these tools.
        *   Ensure the versions of `java-ast` and the LSP server are kept up-to-date to patch known vulnerabilities.

*   **API Key Management:**
    *   API keys (e.g., `ANTHROPIC_API_KEY`) should be stored securely (e.g., in `.env` files, not committed to version control) and only accessed by the backend.
    *   Ensure appropriate permissions on `.env` files to prevent unauthorized access.

*   **Denial of Service (DoS):**
    *   **Risk:** A malicious user could provide a path to an extremely large Java project or a project with circular dependencies, causing excessive resource consumption (CPU, memory) during parsing or call hierarchy analysis.
    *   **Mitigation:**
        *   Implement timeouts for external process calls (`java-ast`, LSP interactions).
        *   Consider resource limiting for child processes if possible.
        *   Implement rate limiting on API endpoints to prevent abuse.
        *   Add reasonable limits on recursion depth for call hierarchy analysis.

*   **Error Handling:**
    *   Ensure that detailed internal error messages or stack traces are not exposed directly to the user in API responses, as they might reveal sensitive information about the system or vulnerabilities.

*   **Frontend Security:**
    *   While most heavy processing is backend, ensure standard frontend best practices (e.g., XSS prevention if user-controlled content is ever rendered, though this seems less likely with current scope).

## Testing Strategy

### Backend (Express.js)
*   **Unit Tests:**
    *   Test individual route handlers/controllers with mocked services (`ClaudeService`, `LspManager`, etc.) to verify input validation, correct service calls, and response formatting.
    *   Test any utility functions or helper modules.
*   **Integration Tests:**
    *   Test API endpoints using a testing library like `supertest`.
    *   These tests would involve making actual HTTP requests to the Express app (running in a test environment) but still mocking the external services (LSP, LLM, `java-ast`) to ensure predictable behavior and avoid external dependencies during tests.
    *   Verify request validation, correct workflow orchestration (e.g., ensuring disambiguation flow works), and response codes/bodies.

### Frontend (Vue.js)
*   **Unit Tests (using Vue Test Utils):**
    *   Test individual Vue components: verify rendering based on props, event emissions, method calls when user interacts (e.g., button clicks).
    *   Mock API service calls to control component behavior based on API responses.
    *   Test utility functions and state management logic (Pinia stores/actions/getters).
*   **Component Integration Tests:**
    *   Test interactions between parent and child components.
*   **End-to-End (E2E) Tests (using Cypress or Playwright):**
    *   Test the full user interaction flow by running the Vue app and a mock backend (or the real backend with all its deeper services mocked).
    *   Simulate user actions (typing, clicking) and verify UI updates and data display.
    *   Example E2E scenarios:
        1.  User provides project path and query, gets a diagram directly.
        2.  User provides query that leads to disambiguation, selects an option, then gets a diagram.
        3.  User inputs invalid data and sees an error message.

This document provides a foundational plan for the web UI. Specific design choices for UI/UX (styling, layout, precise wording) will be refined during development. 