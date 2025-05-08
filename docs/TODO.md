New Status Types:
- Code complete: Implementation exists.
- Tested: Unit tests exist.
- Tests failing: Code complete, tests exist, but tests are failing.
- Integrated: Hooked into core functionality.
- Done: Manually tested and verified by you.
- Broken: All tests pass, but manually tested and found to be broken.

# Project TODOs

This document tracks tasks, challenges, and considerations for the Java LSP Diagram Generator project, following a phased approach based on dependencies. Each item includes a link back to the source document for more context.

---

## Phase 1: Foundational Setup & Core Definitions

### 1.1. Project Setup & Initial Documentation
- [ ] **Deployment - Create `package.json`:** Define project dependencies and scripts. ([Details](./package_json_details.md))
    - Status: TODO
    - Details: Document outlines key dependencies, devDependencies, and scripts.
- [ ] **Deployment - Specify Node.js version:** Define the specific Node.js version requirement. ([Details](./deployment_and_setup.md#prerequisites))
    - Status: TODO
    - Details:
- [ ] **Deployment - Specify JDK version:** Define the specific JDK version requirement. ([Details](./deployment_and_setup.md#prerequisites))
    - Status: TODO
    - Details:
- [ ] **Deployment - Specify LSP Server setup:** Provide clear instructions for obtaining and setting up the Java LSP server. ([Details](./deployment_and_setup.md#prerequisites))
    - Status: TODO
    - Details:
- [ ] **Deployment - Create `.env.example`:** Create or update the `.env.example` file. ([Details](./deployment_and_setup.md#configuration))
    - Status: TODO
    - Details:
- [ ] **Project Overview - Update Tool Versions:** Ensure specific tool versions (Eclipse JDT LS, `java-ast`) are documented. ([Details](./project_overview.md#tools))
    - Status: TODO
    - Details: Check `deployment_and_setup.md` for consistency.

### 1.2. Core Data Model
- [ ] **Data Model - Define Core Structures:** Ensure all data structures (`DiscoveredEndpoint`, `CallHierarchyGraph`, etc.) are well-defined and consistently used. ([Details](./data_model.md#core-data-structures))
    - Status: Review Needed
    - Details: Core structures are largely defined in `data_model.md`. Review for consistency. 
    - Sub-Tasks:
        - [ ] Ensure `DiscoveredEndpoint`, `CallHierarchyGraph`, `MethodNode`, `CallHierarchyEdge`, `ControlFlowInfo`, `DisambiguationChoice`, `DisambiguationResult`, `MermaidDiagram`, and `EndpointDetails` are consistently defined and used across all relevant documents and planned code modules.
        - [ ] Verify `EndpointDetails` structure is comprehensive for its purpose (LLM diagram generation context).
        - [ ] Confirm that the note in `data_model.md` regarding the use of standard LSP types (e.g., from `vscode-languageserver-protocol`) for detailed LSP messages is adequate and that `CallHierarchyNodeLSP` correctly represents `CallHierarchyItem`.
- [ ] **Data Model - `Range` and `Position` types:** Use standard LSP types for `Range` and `Position`. ([Details](./data_model.md#notes))
    - Status: Done
    - Details: `data_model.md` confirms these will be standard LSP types, and further clarifies that other LSP types will also be standard/from libraries.

---

## Phase 2: Java Analysis Tools Integration

### 2.1. Java LSP Interaction
- [ ] **LSP Interaction - Define LSP Types:** Create TypeScript interfaces for LSP message structures. ([Details](./java_lsp.md#srclsptypests))
    - Status: TODO
    - Details: Consider using `vscode-languageserver-protocol` types.
- [ ] **LSP Interaction - Implement `json_rpc_protocol.ts`:** Create utility functions for formatting and parsing JSON-RPC messages. ([Details](./java_lsp.md#srclspjson_rpc_protocolts))
    - Status: TODO
    - Details:
- [ ] **LSP Interaction - Implement `LspClient`:** Develop the `LspClient` class to abstract LSP requests and notifications. ([Details](./java_lsp.md#srclsplsp_clientts))
    - Status: TODO
    - Details:
- [ ] **LSP Interaction - Implement `LspManager`:** Develop the `LspManager` class for managing the LSP server lifecycle and communication. ([Details](./java_lsp.md#srclsplsp_managerts))
    - Status: TODO
    - Details:
- [ ] **LSP Interaction - Implement `CallHierarchyService`:** Develop the service to build the call hierarchy using `LspClient`. ([Details](./java_lsp.md#srcservicescall_hierarchy_servicets))
    - Status: TODO
    - Details: Includes logic for filtering and managing recursion depth.
- [ ] **LSP Interaction - Test `json_rpc_protocol.ts`:** Write unit tests for JSON-RPC utilities. ([Details](./java_lsp.md#2-srclspjson_rpc_protocolts))
    - Status: TODO
    - Details:
- [ ] **LSP Interaction - Test `LspClient`:** Write unit tests for `LspClient`. ([Details](./java_lsp.md#3-srclsplsp_clientts-lspclient))
    - Status: TODO
    - Details:
- [ ] **LSP Interaction - Test `LspManager`:** Write unit tests for `LspManager`. ([Details](./java_lsp.md#1-srclsplsp_managerts-lspmanager))
    - Status: TODO
    - Details:
- [ ] **LSP Interaction - Test `CallHierarchyService`:** Write unit tests for `CallHierarchyService`. ([Details](./java_lsp.md#6-srcservicescall_hierarchy_servicets-callhierarchyservice))
    - Status: TODO
    - Details:

### 2.2. `java-ast` Integration & Analysis
- [ ] **`java-ast` - Define AST Types:** Create TypeScript interfaces for the `java-ast` JSON output structure (or for an abstraction layer over the library's types). ([Details](./java_ast_integration.md#srcjava-astjava_ast_typests))
    - Status: TODO
    - Details:
- [ ] **`java-ast` - Implement `JavaAstRunner`:** Develop the class for executing the `java-ast` tool. ([Details](./java_ast_integration.md#srcjava-astjava_ast_runnerts))
    - Status: TODO
    - Details:
- [ ] **`java-ast` - Implement `AstParserService`:** Develop the class for traversing ASTs (obtained by direct calls to the `java-ast` library) and extracting information. ([Details](./java_ast_integration.md#srcjava-astast_parser_servicets))
    - Status: TODO
    - Details: This service will now directly use the `java-ast` library API.
- [ ] **`java-ast` - Test `JavaAstRunner`:** Write unit tests for `JavaAstRunner`. ([Details](./java_ast_integration.md#testing-strategy))
    - Status: TODO
    - Details:
- [ ] **`java-ast` - Test `AstParserService`:** Write unit tests for `AstParserService`, including its interaction with the `java-ast` library. ([Details](./java_ast_integration.md#testing-strategy))
    - Status: TODO
    - Details:

---

## Phase 3: LLM Interaction

- [ ] **LLM Interaction - Define LLM Types:** Create TypeScript interfaces for LLM-related data structures. ([Details](./llm_interaction.md#srcllmllm_typests))
    - Status: TODO
    - Details:
- [ ] **LLM Interaction - Implement `PromptBuilder`:** Create utility functions for constructing LLM prompts. ([Details](./llm_interaction.md#srcllmprompt_builderts))
    - Status: TODO
    - Details:
- [ ] **Web UI - Security: API Key Management:** Securely manage API keys on the backend. ([Details](./web_ui_interaction.md#security-considerations))
    - Status: TODO
    - Details:
- [ ] **LLM Interaction - Implement `ClaudeService`:** Develop the `ClaudeService` class for API communication. ([Details](./llm_interaction.md#srcllmclaude_servicets))
    - Status: TODO
    - Details:
- [ ] **LLM Interaction - Test `PromptBuilder`:** Write unit tests for `PromptBuilder`. ([Details](./llm_interaction.md#testing-strategy))
    - Status: TODO
    - Details:
- [ ] **LLM Interaction - Test `ClaudeService`:** Write unit tests for `ClaudeService`. ([Details](./llm_interaction.md#testing-strategy))
    - Status: TODO
    - Details:

---

## Phase 4: Core Orchestration & Data Flow

- [ ] **Core Orchestration - Implement `diagramController.ts` / `OrchestrationService`:** Develop the main orchestration logic. ([Details](./core_orchestration.md#key-files-and-their-roles-typescript---backend))
    - Status: TODO
    - Details:
- [ ] **Core Orchestration - Data Integrity & Transformation:** Ensure seamless data transformation and consistency between services. ([Details](./core_orchestration.md#data-management-and-transformation))
    - Status: TODO
    - Details:
- [ ] **Core Orchestration - Error Propagation & Aggregation:** Effectively aggregate, interpret, and propagate errors from services. ([Details](./core_orchestration.md#error-handling-strategy))
    - Status: TODO
    - Details:
- [ ] **Core Orchestration - Test Orchestration Logic:** Write unit/integration tests for the orchestration workflow. ([Details](./core_orchestration.md#testing-strategy))
    - Status: TODO
    - Details: Mock underlying services.

---

## Phase 5: Web UI (Backend API & Frontend Basics)

### 5.1. Backend API
- [ ] **Web UI - Implement Express API Endpoints:** Develop backend API endpoints (`/api/diagram/generate`, `/api/project/disambiguate`). ([Details](./web_ui_interaction.md#1-api-endpoints))
    - Status: TODO
    - Details:
- [ ] **Web UI - Project Path Validation:** Securely validate user-provided Java project path on the backend. ([Details](./web_ui_interaction.md#security-considerations))
    - Status: TODO
    - Details: Implement path traversal protection.
- [ ] **Web UI - Security: Input Sanitization for tools:** Ensure proper sanitization for inputs to `java-ast` and LSP server to prevent command injection. ([Details](./web_ui_interaction.md#security-considerations))
    - Status: TODO
    - Details: Use `child_process.spawn()` correctly.
- [ ] **Web UI - Test Backend API:** Write integration tests for Express API endpoints. ([Details](./web_ui_interaction.md#backend-expressjs))
    - Status: TODO
    - Details:

### 5.2. Frontend Basics (Vue.js)
- [ ] **Web UI - Frontend State Management:** Choose and implement frontend state management (Vue reactivity or Pinia). ([Details](./web_ui_interaction.md#2-state-management))
    - Status: TODO
    - Details:
- [ ] **Web UI - API Communication Service:** Implement client-side service (`apiService.js`) for backend communication. ([Details](./web_ui_interaction.md#3-api-communication))
    - Status: TODO
    - Details:
- [ ] **Web UI - Implement Vue Components:** Create `ProjectInputForm.vue`, `DiagramDisplay.vue`, etc. ([Details](./web_ui_interaction.md#1-key-components))
    - Status: TODO
    - Details: (Note: `DiagramDisplay.vue` is also listed in Phase 6, main implementation there)

---

## Phase 6: Mermaid Diagram Management & Rendering

- [ ] **Mermaid - Implement `DiagramDisplay.vue`:** Develop the Vue component for rendering and user utilities. ([Details](./mermaid_diagram_management.md#vue-component-diagramdisplayvue-or-similar))
    - Status: TODO
    - Details: Includes copy syntax, download options.
- [ ] **Mermaid - Optional Syntax Validation:** Implement basic client-side or server-side Mermaid syntax validation. ([Details](./mermaid_diagram_management.md#2-syntax-validation-optional))
    - Status: TODO
    - Details:
- [ ] **Mermaid - Test `DiagramDisplay.vue`:** Write unit tests for `DiagramDisplay.vue`. ([Details](./mermaid_diagram_management.md#testing-strategy))
    - Status: TODO
    - Details: Mock `mermaid.js`.

---

## Phase 7: UI Enhancements & Features

- [ ] **Web UI - Disambiguation User Experience:** Design an intuitive UI for presenting disambiguation choices. ([Details](./web_ui_interaction.md#frontend-vuejs))
    - Status: TODO
    - Details: Implement `EndpointDisambiguation.vue`.
- [ ] **Web UI - Responsiveness & Feedback:** Maintain UI responsiveness and provide clear feedback during long operations. ([Details](./web_ui_interaction.md#frontend-vuejs))
    - Status: TODO
    - Details: Implement `LoadingIndicator.vue`.
- [ ] **Web UI - Error Presentation:** Consistently handle and clearly present errors from backend components. ([Details](./web_ui_interaction.md#frontend-vuejs))
    - Status: TODO
    - Details: Implement `ErrorMessage.vue`.
- [ ] **Web UI - Test Vue Components:** Write unit tests for Vue components. ([Details](./web_ui_interaction.md#frontend-vuejs))
    - Status: TODO
    - Details: (Covers new components from this phase)

---

## Phase 8: Advanced Features, Refinements, and Iterations

*(These tasks generally depend on a working V1 of the system and can be iterated upon)*

### 8.1. Java LSP Interaction Refinements
- [ ] **LSP Interaction - Lifecycle Management:** Implement robust lifecycle management for the Java LSP server process (startup, shutdown, crash recovery, resource consumption). ([Details](./java_lsp.md#launching-the-java-lsp-server))
    - Status: TODO
    - Details:
- [ ] **LSP Interaction - Performance of LSP Calls:** Investigate and optimize performance for potentially slow LSP calls (e.g., `textDocument/references`, `callHierarchy/outgoingCalls`). ([Details](./java_lsp.md#key-lsp-requests-for-call-hierarchy))
    - Status: TODO
    - Details: Consider caching, targeted queries.
- [ ] **LSP Interaction - Filtering Out-of-Project Calls:** Ensure accurate filtering of calls to JDK internals and external library dependencies. ([Details](./java_lsp.md#srcservicescall_hierarchy_servicets))
    - Status: TODO
    - Details: Refine heuristics like path matching.
- [ ] **LSP Interaction - Accuracy of Call Hierarchy:** Address potential inaccuracies in LSP-provided call hierarchy due to project configuration or dynamic Java features. ([Details](./java_lsp.md#key-lsp-requests-for-call-hierarchy))
    - Status: TODO
    - Details:
- [ ] **LSP Interaction - Compatibility:** Ensure correct behavior and LSP feature support across different Java project structures, build systems, and Java versions. ([Details](./java_lsp.md#launching-the-java-lsp-server))
    - Status: TODO
    - Details:

### 8.2. `java-ast` Integration Refinements
- [ ] **`java-ast` - Tool Dependency & Stability:** Monitor `java-ast` tool's stability, maintenance, and output consistency. ([Details](./java_ast_integration.md#overview))
    - Status: TODO
    - Details:
- [ ] **`java-ast` - AST Complexity & Traversal:** Develop accurate and efficient algorithms for traversing complex Java ASTs. ([Details](./java_ast_integration.md#ast-processing-and-information-extraction))
    - Status: TODO
    - Details:
- [ ] **`java-ast` - Performance:** Address performance implications of frequent `java-ast` invocations. ([Details](./java_ast_integration.md#java-ast-invocation-and-execution))
    - Status: TODO
    - Details: Explore caching.
- [ ] **`java-ast` - Control Flow Mapping:** Correctly identify and translate Java control flow structures from AST to graph conditions. ([Details](./java_ast_integration.md#2-analyzing-control-flow-step-3))
    - Status: TODO
    - Details:

### 8.3. LLM Interaction Refinements
- [ ] **LLM Interaction - Prompt Engineering (Disambiguation):** Iteratively refine prompts for consistent and accurate endpoint disambiguation. ([Details](./llm_interaction.md#1-endpoint-disambiguation-prompt))
    - Status: TODO
    - Details:
- [ ] **LLM Interaction - Prompt Engineering (Diagram Generation):** Iteratively refine prompts for valid, well-structured Mermaid syntax. ([Details](./llm_interaction.md#2-mermaid-diagram-generation-prompt))
    - Status: TODO
    - Details:
- [ ] **LLM Interaction - Disambiguation Robustness:** Design a reliable process for low-confidence matches or multiple plausible endpoints from LLM. ([Details](./llm_interaction.md#overview))
    - Status: TODO
    - Details:
- [ ] **LLM Interaction - API Management:** Manage Claude API rate limits, costs, and potential latency. ([Details](./llm_interaction.md#3-error-handling))
    - Status: TODO
    - Details: Implement retry mechanisms with backoff.
- [ ] **LLM Interaction - Context Window Limits:** Develop strategies for handling large inputs that might exceed LLM context window. ([Details](./llm_interaction.md#prompt-engineering))
    - Status: TODO
    - Details:

### 8.4. Core Orchestration Refinements
- [ ] **Core Orchestration - State Management (Disambiguation):** Implement robust state management for server-side disambiguation if chosen. ([Details](./core_orchestration.md#sessionstate-management-for-disambiguation))
    - Status: TODO
    - Details:

### 8.5. Mermaid Diagram Management Refinements
- [ ] **Mermaid - Rendering Complex Diagrams:** Ensure `mermaid.js` can efficiently render large/complex diagrams. ([Details](./mermaid_diagram_management.md#rendering-in-the-web-ui-vuejs))
    - Status: TODO
    - Details:
- [ ] **Mermaid - Syntax Error Handling:** Robustly handle malformed Mermaid syntax from LLM; provide user feedback. ([Details](./mermaid_diagram_management.md#2-syntax-validation-optional))
    - Status: TODO
    - Details:

### 8.6. "Talk to the Diagram" Feature (New Major Feature - Depends on V1)
- [ ] **TalkToDiagram - LLM Command Interpretation:** Develop robust LLM interpretation for diverse user commands. ([Details](./talk_to_the_diagram.md#overview))
    - Status: TODO
    - Details:
- [ ] **TalkToDiagram - LLM Context Management:** Maintain context of diagram state and conversation history for iterative refinements. ([Details](./challenges.md#llm---context-management))
    - Status: TODO
    - Details:
- [ ] **TalkToDiagram - Stateful Diagram Modification:** Develop methods to apply user-requested modifications to diagram data. ([Details](./challenges.md#stateful-diagram-modification))
    - Status: TODO
    - Details:
- [ ] **TalkToDiagram - Mapping NL to Graph Operations:** Translate LLM command interpretations into concrete graph operations. ([Details](./challenges.md#mapping-nl-to-graph-operations))
    - Status: TODO
    - Details:
- [ ] **TalkToDiagram - Preventing Unintended Modifications:** Handle LLM misinterpretations leading to incorrect diagram changes. ([Details](./challenges.md#llm---preventing-unintended-modifications))
    - Status: TODO
    - Details:
- [ ] **TalkToDiagram - UI for Interaction:** Design an intuitive UI integrating diagram display with conversational input. ([Details](./challenges.md#user-interface-for-interaction))
    - Status: TODO
    - Details:
- [ ] **TalkToDiagram - Performance of Dynamic Updates:** Ensure rapid re-rendering of the diagram after modifications. ([Details](./challenges.md#performance-of-dynamic-updates))
    - Status: TODO
    - Details:
- [ ] **TalkToDiagram - Complexity of "What-If" Scenarios:** Investigate implementation of "what-if" scenarios. ([Details](./challenges.md#complexity-of-what-if-scenarios))
    - Status: TODO
    - Details:
- [ ] **TalkToDiagram - Scope of Modifications:** Define clear boundaries for modifiable diagram aspects. ([Details](./challenges.md#scope-of-modifications))
    - Status: TODO
    - Details:
- [ ] **TalkToDiagram - Undo/Redo Functionality:** Plan for potential undo/redo functionality. ([Details](./challenges.md#undoredo-functionality))
    - Status: TODO
    - Details:

### 8.7. Scalability and Performance
- [ ] **Scalability - Caching `java-ast` Results:** Implement caching for ASTs and control flow information. ([Details](./scalability_and_performance.md#1-caching))
    - Status: TODO
    - Details: Invalidate based on file modification timestamps.
- [ ] **Scalability - Caching LSP Results:** Investigate and implement caching for expensive LSP queries. ([Details](./scalability_and_performance.md#1-caching))
    - Status: TODO
    - Details:
- [ ] **Scalability - Caching LLM Disambiguation Choices:** Cache LLM disambiguation choices for similar queries. ([Details](./scalability_and_performance.md#1-caching))
    - Status: TODO
    - Details:
- [ ] **Scalability - Selective Parsing/Analysis:** Implement options for targeted parsing of specific source directories. ([Details](./scalability_and_performance.md#2-efficient-data-handling))
    - Status: TODO
    - Details:
- [ ] **Scalability - Data Minimization for LLM:** Send only necessary information to the LLM to respect context limits. ([Details](./scalability_and_performance.md#2-efficient-data-handling))
    - Status: TODO
    - Details:
- [ ] **Scalability - Asynchronous Operations:** Leverage Node.js async nature for all I/O-bound operations. ([Details](./scalability_and_performance.md#3-asynchronous-operations-and-concurrency))
    - Status: TODO
    - Details: (Should be a consideration from early phases)
- [ ] **Scalability - Worker Threads (CPU-bound tasks):** Consider worker threads for CPU-intensive Node.js tasks. ([Details](./scalability_and_performance.md#3-asynchronous-operations-and-concurrency))
    - Status: TODO
    - Details:
- [ ] **Scalability - Optimize `java-ast` CLI Options:** Explore and use performance-enhancing CLI options for `java-ast`. ([Details](./scalability_and_performance.md#4-optimizing-tool-interactions))
    - Status: TODO
    - Details:
- [ ] **Scalability - Call Hierarchy Depth Configuration:** Implement configurable max recursion depth for call hierarchy. ([Details](./scalability_and_performance.md#4-optimizing-tool-interactions))
    - Status: TODO
    - Details: (Can be an early configuration option)
- [ ] **Scalability - Metrics and Monitoring (Future):** Plan for instrumenting the application to log timings for key operations. ([Details](./scalability_and_performance.md#6-metrics-and-monitoring-future-consideration))
    - Status: TODO
    - Details:

### 8.8. Web UI Security Refinements
- [ ] **Web UI - Security: Denial of Service:** Implement measures to mitigate DoS risks (timeouts, resource limits). ([Details](./web_ui_interaction.md#security-considerations))
    - Status: TODO
    - Details:

### 8.9. Advanced Testing
- [ ] **Web UI - E2E Tests:** Develop E2E tests for key user flows. ([Details](./web_ui_interaction.md#end-to-end-e2e-tests-using-cypress-or-playwright))
    - Status: TODO
    - Details:
- [ ] **LLM Interaction - Controlled Integration Tests:** Implement a few controlled integration tests with the live Claude API. ([Details](./llm_interaction.md#integration-tests-limited--controlled))
    - Status: TODO
    - Details: Mark as separate due to cost/flakiness.

---

## Phase 9: Documentation, Final Deployment & Future Planning

### 9.1. Deployment & Setup Finalization
- [ ] **Deployment - Test Fixture Setup Instructions:** Provide clear instructions for setting up the test fixture Java project. ([Details](./deployment_and_setup.md#test-fixture-setup))
    - Status: TODO
    - Details: (Needed throughout development and testing)
- [ ] **Deployment - Production Build Instructions:** Document steps for creating production builds. ([Details](./deployment_and_setup.md#building-for-production-placeholder))
    - Status: TODO
    - Details:
- [ ] **Deployment - Deployment Guidance:** Provide guidance on deploying the application. ([Details](./deployment_and_setup.md#deployment-placeholder))
    - Status: TODO
    - Details:

### 9.2. User Guide
- [ ] **User Guide - Update "Getting Started":** Ensure setup steps in user guide align with `deployment_and_setup.md`. ([Details](./user_guide.md#getting-started))
    - Status: TODO
    - Details:
- [ ] **User Guide - Refine "Generate Diagram" examples:** Provide diverse and clear examples for endpoint queries. ([Details](./user_guide.md#2-input-project-details))
    - Status: TODO
    - Details:
- [ ] **User Guide - Detail "Talk to the Diagram" examples:** Expand on examples for conversational diagram refinement. ([Details](./user_guide.md#making-requests))
    - Status: TODO
    - Details: (If feature is implemented)
- [ ] **User Guide - Troubleshooting Section:** Enhance troubleshooting tips based on implemented error handling and common issues. ([Details](./user_guide.md#troubleshooting))
    - Status: TODO
    - Details:

### 9.3. Ongoing Project Maintenance
- [ ] **Data Model - Living Specification:** Keep the data model document updated as the project evolves. ([Details](./data_model.md#notes))
    - Status: TODO
    - Details: (Ongoing task)

### 9.4. Future Enhancements (Revisit/Plan)
- [ ] **Future - Broader Language Support:** (Future) Explore extending to other backend languages. ([Details](./project_overview.md#broader-language-support))
    - Status: TODO
    - Details:
- [ ] **Future - Different Diagram Types:** (Future) Explore generating other diagram types (PlantUML, etc.). ([Details](./project_overview.md#different-diagram-types))
    - Status: TODO
    - Details:
- [ ] **Future - Enhanced Diagram Interactivity:** (Future) Explore deeper diagram interactivity beyond native Mermaid. ([Details](./project_overview.md#enhanced-diagram-interactivity-beyond-mermaid-native))
    - Status: TODO
    - Details:
- [ ] **Future - IDE Integration:** (Future) Consider developing IDE plugins. ([Details](./project_overview.md#ide-integration))
    - Status: TODO
    - Details:
- [ ] **Future - Batch Processing:** (Future) Allow generating diagrams for multiple endpoints/modules. ([Details](./project_overview.md#batch-processing-and-documentation-generation))
    - Status: TODO
    - Details:
- [ ] **Future - More Sophisticated Analysis:** (Future) Explore deeper static/runtime analysis integration. ([Details](./project_overview.md#more-sophisticated-analysis))
    - Status: TODO
    - Details:
- [ ] **Future - Support for Asynchronous Operations:** (Future) Improve representation of async calls. ([Details](./project_overview.md#support-for-asynchronous-operations))
    - Status: TODO
    - Details: (Also see Scalability section)
- [ ] **Future - User Accounts and Saved Diagrams:** (Future) Plan for user accounts if deployed as a shared service. ([Details](./project_overview.md#user-accounts-and-saved-diagrams))
    - Status: TODO
    - Details:
- [ ] **Future - Advanced Configuration Options:** (Future) Plan for more granular filtering and analysis controls. ([Details](./project_overview.md#advanced-configuration-options))
    - Status: TODO
    - Details:
- [ ] **Future - Alternative LLMs:** (Future) Design for flexibility to switch LLMs. ([Details](./project_overview.md#alternative-llms))
    - Status: TODO
    - Details:

---
This revised TODO list provides a phased approach to project development. 