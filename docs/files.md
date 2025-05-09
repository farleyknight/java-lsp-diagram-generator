# Project File Structure

This document outlines the planned file and folder structure for the `java-lsp-diagram-generator` project.

.
├── bin/                      # Binary files, e.g., LSP server
├── client/                   # Vue.js Frontend
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.vue
│   │   ├── main.ts             # Vue app entry point
│   │   ├── assets/             # Static assets like images, fonts
│   │   │   └── logo.png        # Example asset
│   │   ├── components/         # Vue components
│   │   │   ├── DiagramDisplay.vue
│   │   │   ├── EndpointDisambiguation.vue
│   │   │   ├── ErrorMessage.vue
│   │   │   ├── LoadingIndicator.vue
│   │   │   └── ProjectInputForm.vue
│   │   ├── router/             # Vue Router configuration
│   │   │   └── index.ts
│   │   ├── services/           # Frontend services (e.g., API communication)
│   │   │   └── apiService.ts
│   │   └── store/              # Pinia state management
│   │       └── index.ts
│   ├── tsconfig.json         # TypeScript configuration for the client
│   └── vue.config.js         # Vue CLI configuration (or vite.config.ts if Vite is chosen)
├── dist/                     # Output directory for compiled backend code
│   └── server/
│       ├── index.js          # Main compiled server file
│       └── ...               # Other compiled backend files and map files
├── docs/                     # Project documentation
│   ├── TODO.md
│   ├── TODO_deps.md
│   ├── challenges.md
│   ├── core_orchestration.md
│   ├── data_model.md
│   ├── deployment_and_setup.md
│   ├── files.md              # This file
│   ├── java_ast_integration.md
│   ├── java_lsp.md
│   ├── llm_interaction.md
│   ├── mermaid_diagram_management.md
│   ├── package_json_details.md
│   ├── project_overview.md
│   ├── scalability_and_performance.md
│   ├── talk_to_the_diagram.md
│   ├── user_guide.md
│   └── web_ui_interaction.md
├── src/                      # Backend Node.js/TypeScript source code
│   ├── config/
│   │   ├── index.ts            # Main configuration loader/aggregator for the backend
│   │   └── lsp_config.ts     # Configuration for the Java LSP server interaction
│   ├── controllers/
│   │   └── diagramController.ts  # Handles API requests and orchestrates service calls
│   ├── java-ast/
│   │   ├── ast_parser_service.ts # Service to parse AST from java-ast tool output
│   │   ├── java_ast_runner.ts  # Service to execute the java-ast tool
│   │   └── java_ast_types.ts   # TypeScript type definitions for java-ast output
│   ├── llm/
│   │   ├── claude_service.ts   # Service for interacting with the Claude API
│   │   ├── llm_types.ts        # TypeScript type definitions for LLM request/response
│   │   └── prompt_builder.ts   # Utility for constructing prompts for the LLM
│   ├── lsp/
│   │   ├── json_rpc_protocol.ts# Handles JSON-RPC message formatting and parsing
│   │   ├── lsp_client.ts       # Client for making specific LSP requests
│   │   ├── lsp_manager.ts      # Manages the lifecycle of the Java LSP server process
│   │   └── types.ts            # TypeScript type definitions for LSP messages (or lsp_types.ts)
│   ├── services/               # Core business logic services
│   │   └── call_hierarchy_service.ts # Service to build call hierarchies using LSP
│   ├── server/                 # Express.js application specific files
│   │   ├── index.ts            # Entry point for the Express server
│   │   ├── middleware/
│   │   │   └── errorHandler.ts   # Example global error handling middleware
│   │   └── routes/
│   │       ├── diagramRoutes.ts  # API routes for diagram generation features
│   │       └── projectRoutes.ts  # API routes for project and disambiguation features
│   ├── scripts/              # Utility Node.js scripts (e.g., for launching LSP)
│   │   ├── launch-lsp.ts     # Script to launch the LSP server (detached)
│   │   └── stop-lsp.ts       # Script to stop the detached LSP server
│   ├── types/                  # Shared Data Transfer Objects (DTOs) and data model types for the backend
│   │   └── index.ts            # Barrel file for types, or individual type definition files
│   └── utils/                  # Common utility functions for the backend
│       └── index.ts            # Example barrel file for utility functions
├── tests/                    # Test files for various types of testing
│   ├── e2e/                    # End-to-end tests (e.g., using Playwright)
│   │   └── specs/
│   │       └── example.spec.ts   # Example E2E test file (adjust extension for Playwright)
│   ├── fixtures/               # Test fixture data and projects
│   │   └── SampleJavaProject/  # A sample Java project for LSP testing
│   ├── integration/            # Integration tests (testing interactions between modules)
│   │   ├── services/
│   │   │   └── call_hierarchy_service.int.test.ts # Example integration test
│   │   └── api/
│   │       └── diagram.api.int.test.ts            # Example API integration test
│   └── unit/                   # Unit tests (testing individual modules/functions in isolation)
│       ├── lsp/
│       │   ├── lsp_manager.test.ts
│       │   └── json_rpc_protocol.test.ts
│       └── services/
│           └── call_hierarchy_service.test.ts
├── scripts/                  # Shell scripts for utility tasks
│   └── install-lsp.sh        # Script to download and install the Java LSP server
├── .env                      # Local environment variables (gitignored)
├── .env.example              # Example environment variables file
├── .eslintignore             # Files and patterns for ESLint to ignore
├── .eslintrc.cjs             # ESLint configuration file
├── .gitignore                # Specifies intentionally untracked files that Git should ignore
├── .lsp.pid                  # PID file for the running LSP server (gitignored)
├── .prettierignore           # Files and patterns for Prettier to ignore
├── .prettierrc.json          # Prettier configuration file
├── jest.config.ts            # Jest test runner configuration (or vitest.config.ts)
├── package-lock.json         # Records exact versions of dependencies (generated by npm)
├── package.json
├── README.md                 # General information about the project
├── tsconfig.json             # Root TypeScript configuration (for editor, solution-wide settings)
└── tsconfig.server.json      # TypeScript configuration for compiling the backend (src/ -> dist/) 