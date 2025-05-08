# Project Task Dependencies

This document outlines the dependencies between various tasks in the Java LSP Diagram Generator project, derived from `docs/TODO.md`. The goal is to clarify the order in which tasks should be approached.

**Key:**
*   **Task:** The task description from `TODO.md`.
*   **Depends On:** A list of tasks or foundational elements that should ideally be completed or defined before starting this task.
*   **Leads To:** Tasks that depend on the completion of this task.

---

## Phase 1: Foundational Setup & Core Definitions

### 1.1. Project Setup & Initial Documentation
*   **Task:** Deployment - Specify Node.js version
    *   **Depends On:** Project decision.
    *   **Leads To:** Setup instructions, environment consistency.
*   **Task:** Deployment - Specify JDK version
    *   **Depends On:** Project decision, Java LSP server requirements.
    *   **Leads To:** Setup instructions, environment consistency.
*   **Task:** Deployment - Specify `java-ast.jar` version and source
    *   **Depends On:** Project decision, choice of `java-ast` tool.
    *   **Leads To:** `java-ast` integration.
*   **Task:** Deployment - Specify LSP Server setup
    *   **Depends On:** Project decision, choice of Java LSP server.
    *   **Leads To:** Java LSP interaction.
*   **Task:** Deployment - Create `.env.example`
    *   **Depends On:** Identification of necessary environment variables (API keys, paths).
    *   **Leads To:** Easier setup for developers.
*   **Task:** Project Overview - Update Tool Versions
    *   **Depends On:** Decisions from the deployment/setup tasks above.
    *   **Leads To:** Accurate project documentation.

### 1.2. Core Data Model
*   **Task:** Data Model - Define Core Structures (`DiscoveredEndpoint`, `CallHierarchyGraph`, etc.)
    *   **Depends On:** Initial project understanding.
    *   **Leads To:** Almost all other development tasks (LSP, AST, LLM, Orchestration, UI).
*   **Task:** Data Model - `Range` and `Position` types
    *   **Depends On:** Core Structures definition, decision whether to use standard LSP types.
    *   **Leads To:** Consistent location representation.

---

## Phase 2: Java Analysis Tools Integration

### 2.1. Java LSP Interaction
*   **Task:** LSP Interaction - Define LSP Types
    *   **Depends On:** Decision on using `vscode-languageserver-protocol` or custom types.
    *   **Leads To:** `LspClient`, `CallHierarchyService`.
*   **Task:** LSP Interaction - Implement `json_rpc_protocol.ts`
    *   **Depends On:** Basic understanding of JSON-RPC.
    *   **Leads To:** `LspClient`.
*   **Task:** LSP Interaction - Implement `LspClient`
    *   **Depends On:** LSP Types, `json_rpc_protocol.ts`.
    *   **Leads To:** `LspManager`, `CallHierarchyService`.
*   **Task:** LSP Interaction - Implement `LspManager`
    *   **Depends On:** `LspClient`, LSP Server setup details.
    *   **Leads To:** Core Orchestration.
*   **Task:** LSP Interaction - Implement `CallHierarchyService`
    *   **Depends On:** `LspClient`, LSP Types, Core Data Structures (e.g., for graph representation).
    *   **Leads To:** Core Orchestration.
*   **Task (Testing):** LSP Interaction - Test `json_rpc_protocol.ts`, `LspClient`, `LspManager`, `CallHierarchyService`
    *   **Depends On:** Respective implementation tasks.

### 2.2. `java-ast` Integration & Analysis
*   **Task:** `java-ast` - Define AST Types
    *   **Depends On:** Understanding of `java-ast` output format.
    *   **Leads To:** `AstParserService`.
*   **Task:** `java-ast` - Implement `JavaAstRunner`
    *   **Depends On:** `java-ast.jar` setup, understanding of CLI.
    *   **Leads To:** `AstParserService`.
*   **Task:** `java-ast` - Implement `AstParserService`
    *   **Depends On:** `JavaAstRunner`, AST Types, Core Data Structures.
    *   **Leads To:** Core Orchestration.
*   **Task (Testing):** `java-ast` - Test `JavaAstRunner`, `AstParserService`
    *   **Depends On:** Respective implementation tasks.

---

## Phase 3: LLM Interaction

*   **Task:** LLM Interaction - Define LLM Types
    *   **Depends On:** Understanding of LLM API (Claude) request/response.
    *   **Leads To:** `ClaudeService`, `PromptBuilder`.
*   **Task:** LLM Interaction - Implement `PromptBuilder`
    *   **Depends On:** LLM Types, initial prompt ideas.
    *   **Leads To:** `ClaudeService`.
*   **Task:** Web UI - Security: API Key Management (Backend)
    *   **Depends On:** Decision to use LLM or other keyed services.
    *   **Leads To:** Secure `ClaudeService` implementation.
*   **Task:** LLM Interaction - Implement `ClaudeService`
    *   **Depends On:** LLM Types, `PromptBuilder`, API Key Management.
    *   **Leads To:** Core Orchestration.
*   **Task (Testing):** LLM Interaction - Test `PromptBuilder`, `ClaudeService`
    *   **Depends On:** Respective implementation tasks.

---

## Phase 4: Core Orchestration & Data Flow

*   **Task:** Core Orchestration - Implement `diagramController.ts` / `OrchestrationService`
    *   **Depends On:** `LspManager`, `CallHierarchyService`, `AstParserService`, `ClaudeService`, Core Data Structures.
    *   **Leads To:** Backend API Endpoints.
*   **Task:** Core Orchestration - Data Integrity & Transformation
    *   **Depends On:** Core Orchestration implementation.
*   **Task:** Core Orchestration - Error Propagation & Aggregation
    *   **Depends On:** Core Orchestration implementation.
*   **Task (Testing):** Core Orchestration - Test Orchestration Logic
    *   **Depends On:** Core Orchestration implementation.

---

## Phase 5: Web UI (Backend API & Frontend Basics)

### 5.1. Backend API
*   **Task:** Web UI - Implement Express API Endpoints (`/api/diagram/generate`, `/api/project/disambiguate`)
    *   **Depends On:** `diagramController.ts` / `OrchestrationService`.
    *   **Leads To:** Frontend API communication.
*   **Task:** Web UI - Project Path Validation (Backend Security)
    *   **Depends On:** API Endpoint implementation.
*   **Task:** Web UI - Security: Input Sanitization for tools (Backend Security)
    *   **Depends On:** `JavaAstRunner`, `LspManager` (or how they are invoked).
*   **Task (Testing):** Web UI - Test Backend API
    *   **Depends On:** API Endpoint implementation.

### 5.2. Frontend Basics (Vue.js)
*   **Task:** Web UI - Frontend State Management (Vue reactivity or Pinia)
    *   **Depends On:** Project decision on state library.
    *   **Leads To:** Vue component development.
*   **Task:** Web UI - API Communication Service (`apiService.js`)
    *   **Depends On:** Backend API Endpoints defined.
    *   **Leads To:** Vue components interacting with backend.
*   **Task:** Web UI - Implement Vue Components (Initial: `ProjectInputForm.vue`)
    *   **Depends On:** Frontend State Management, `apiService.js`.
    *   **Leads To:** Basic user interaction.

---

## Phase 6: Mermaid Diagram Management & Rendering

*   **Task:** Mermaid - Implement `DiagramDisplay.vue`
    *   **Depends On:** Frontend basics (Vue), a way to get Mermaid syntax (from orchestrator via API).
    *   **Leads To:** Visual display of diagrams.
*   **Task:** Mermaid - Optional Syntax Validation
    *   **Depends On:** Diagram generation process; `DiagramDisplay.vue` if client-side.
*   **Task (Testing):** Mermaid - Test `DiagramDisplay.vue`
    *   **Depends On:** `DiagramDisplay.vue` implementation.

---

## Phase 7: UI Enhancements & Features

*   **Task:** Web UI - Disambiguation User Experience (`EndpointDisambiguation.vue`)
    *   **Depends On:** Core orchestration logic for disambiguation, `DiagramDisplay.vue` (potentially).
*   **Task:** Web UI - Responsiveness & Feedback (`LoadingIndicator.vue`)
    *   **Depends On:** Basic UI structure.
*   **Task:** Web UI - Error Presentation (`ErrorMessage.vue`)
    *   **Depends On:** Basic UI structure, error handling strategy in backend/frontend.
*   **Task (Testing):** Web UI - Test Vue Components (includes these)
    *   **Depends On:** Respective component implementations.

---

## Phase 8: Advanced Features, Refinements, and Iterations

*(These tasks generally depend on a working V1 of the system and can be iterated upon)*

*   **Java LSP Interaction Refinements:**
    *   LSP Interaction - Lifecycle Management
    *   LSP Interaction - Performance of LSP Calls
    *   LSP Interaction - Filtering Out-of-Project Calls
    *   LSP Interaction - Accuracy of Call Hierarchy
    *   LSP Interaction - Compatibility
*   **`java-ast` Integration Refinements:**
    *   `java-ast` - Tool Dependency & Stability (Monitoring)
    *   `java-ast` - AST Complexity & Traversal (Advanced Algorithms)
    *   `java-ast` - Performance (Caching, etc.)
    *   `java-ast` - Control Flow Mapping (Refinements)
*   **LLM Interaction Refinements:**
    *   LLM Interaction - Prompt Engineering (Disambiguation & Diagram Generation)
    *   LLM Interaction - Disambiguation Robustness
    *   LLM Interaction - API Management (Rate limits, costs)
    *   LLM Interaction - Context Window Limits
*   **Core Orchestration Refinements:**
    *   Core Orchestration - State Management (Disambiguation)
*   **Mermaid Diagram Management Refinements:**
    *   Mermaid - Rendering Complex Diagrams
    *   Mermaid - Syntax Error Handling (Robust)
*   **"Talk to the Diagram" Feature (New Major Feature - Depends on V1):**
    *   All tasks under "Talk to the Diagram" section (e.g., LLM Command Interpretation, Stateful Diagram Modification, UI for Interaction, etc.)
        *   **Depends On:** A fully functional diagram generation and display system (Phases 1-6).
*   **Scalability and Performance (Ongoing/Post-V1):**
    *   Most tasks like Caching (`java-ast`, LSP, LLM), Selective Parsing, Data Minimization, Worker Threads, Optimize `java-ast` CLI, Call Hierarchy Depth Configuration.
    *   `Scalability - Asynchronous Operations` should be a consideration from the start but can be optimized.
    *   `Scalability - Call Hierarchy Depth Configuration` could be an early, simple config.
*   **Web UI Security Refinements (Ongoing):**
    *   Web UI - Security: Denial of Service
*   **Testing:**
    *   Web UI - E2E Tests (Depends on significant UI and backend functionality)
    *   LLM Interaction - Controlled Integration Tests (Depends on `ClaudeService`)

---

## Phase 9: Documentation & Final Deployment Tasks

*   **Deployment:**
    *   Deployment - Test Fixture Setup Instructions (Needed for development and testing throughout)
    *   Deployment - Production Build Instructions
    *   Deployment - Deployment Guidance
*   **User Guide:**
    *   User Guide - Update "Getting Started"
    *   User Guide - Refine "Generate Diagram" examples
    *   User Guide - Detail "Talk to the Diagram" examples (If feature is implemented)
    *   User Guide - Troubleshooting Section
*   **Data Model:**
    *   Data Model - Living Specification (Ongoing task)
*   **Project Overview & Future Enhancements (Revisit/Plan):**
    *   Tasks marked "(Future)" can be planned in more detail once V1 is stable.

---
This is a suggested breakdown. Some tasks can be parallelized, and the exact order might shift based on development priorities and findings.
The "Future" tasks from `project_overview.md` are generally deferred until a core product is built, unless they influence fundamental architectural decisions (e.g., "Alternative LLMs" might influence the `ClaudeService` abstraction). 