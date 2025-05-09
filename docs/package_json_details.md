# `package.json` Details

This document outlines the planned structure and content for the project's `package.json` file. It is based on the tools and technologies identified in the project documentation.

## Monorepo Structure Consideration

The project documents (`docs/deployment_and_setup.md`, `docs/web_ui_interaction.md`) suggest a separation between a `server` (Express.js) and a `client` (Vue.js) directory. This could imply:
1.  A single root `package.json` managing all dependencies and scripts.
2.  A root `package.json` for shared devDependencies and top-level scripts, with separate `package.json` files in `server/` and `client/` for their specific dependencies.
3.  A full monorepo setup using tools like Lerna, Nx, or npm/yarn/pnpm workspaces.

For now, this document will outline a comprehensive root `package.json`, which can be adapted if a multi-package structure is chosen.

## Key Sections

### Basic Info
-   `name`: `java-lsp-diagram-generator` (inferred from workspace)
-   `version`: `0.1.0` (initial)
-   `description`: "Node.js TypeScript application with a Web UI (Express & Vue) to generate Mermaid sequence diagrams from Java REST endpoints using Java LSP and java-ast, with LLM (Claude) for disambiguation and diagram generation." (derived from `project_overview.md`)
-   `main`: Likely `dist/server/index.js` (after TypeScript compilation, assuming server entry point) or `src/server/index.ts` (if using `ts-node`).
-   `private`: `true` (as it's an application, not a library to be published initially)
-   `license`: (e.g., "MIT" or "UNLICENSED") - *To be decided*
-   `author`: *To be decided*
-   `repository`: *To be decided*

### Engines
-   `node`: ">=18.0.0" (Placeholder, to be confirmed from `docs/deployment_and_setup.md` which mentions "v18.x or later")

### Scripts

This section will include commands for common development and build tasks.
*Actual script commands will depend on project structure (monorepo vs. single package) and chosen tools (e.g., `nodemon`, `tsc`, Vue CLI/Vite).*

**General & Build:**
-   `"build"`: `"npm run build:server && npm run build:client"` (Example for separate builds) or `"tsc && vue-cli-service build"` (if Vue CLI is used and server is just `tsc`)
-   `"lint"`: `"eslint . --ext .ts,.js,.vue"`
-   `"format"`: `"prettier --write ."`
-   `"typecheck"`: `"tsc --noEmit"`

**Server (Backend - Express.js):**
-   `"server:start"`: `"node dist/server/index.js"` (after build)
-   `"server:dev"`: `"nodemon src/server/index.ts"` (using `ts-node`)
-   `"server:build"`: `"tsc -p tsconfig.server.json"` (example if specific server tsconfig)

**Client (Frontend - Vue.js):**
-   `"client:serve"`: `"vue-cli-service serve"` (or `vite`)
-   `"client:build"`: `"vue-cli-service build"` (or `vite build`)

**Testing:**
-   `"test"`: `"jest"` (or `vitest`)
-   `"test:watch"`: `"jest --watch"`
-   `"test:e2e"`: `"playwright test"`
-   `"test:e2e:open"`: `"playwright test --ui"`

*(Note: If not using a monorepo manager, scripts like `client:serve` might be `cd client && npm run serve` from the root, or these would live in `client/package.json`)*

### Dependencies (Runtime)

These are packages required for the application to run.
-   `@anthropic-ai/sdk`: "^LATEST_VERSION" - For Claude API interaction.
-   `axios`: "^LATEST_VERSION" - HTTP client for API calls (frontend to backend, backend to Claude if not using SDK exclusively).
-   `express`: "^LATEST_VERSION" - Backend web framework.
-   `mermaid`: "^LATEST_VERSION" - For rendering Mermaid diagrams (likely used by frontend).
-   `pinia`: "^LATEST_VERSION" - State management for Vue.js.
-   `vue`: "^LATEST_VERSION" - Frontend framework.
-   `vue-router`: "^LATEST_VERSION" - Routing for Vue.js.
-   `vscode-languageserver-protocol`: "^LATEST_VERSION" - Contains type definitions for LSP.

*(LATEST_VERSION should be replaced with actual current stable versions at the time of creation)*

### DevDependencies (Development & Build)

These packages are needed for development, testing, and building the application.
-   `@types/express`: "^LATEST_VERSION" - Type definitions for Express.
-   `@types/jest`: "^LATEST_VERSION" - Type definitions for Jest (if used).
-   `@types/node`: "^LATEST_VERSION" - Type definitions for Node.js.
-   `@types/supertest`: "^LATEST_VERSION" - Type definitions for Supertest.
-   `@vue/cli-plugin-babel`: "^LATEST_VERSION" (If using Vue CLI)
-   `@vue/cli-plugin-eslint`: "^LATEST_VERSION" (If using Vue CLI)
-   `@vue/cli-plugin-router`: "^LATEST_VERSION" (If using Vue CLI and Vue Router plugin)
-   `@vue/cli-plugin-typescript`: "^LATEST_VERSION" (If using Vue CLI)
-   `@vue/cli-service`: "^LATEST_VERSION" - Build/serve tooling for Vue.js (alternatively `vite`).
-   `@vue/eslint-config-typescript`: "^LATEST_VERSION" (If using Vue CLI's TS ESLint setup)
-   `@vue/test-utils`: "^LATEST_VERSION" - Utilities for testing Vue components.
-   `cypress`: "^LATEST_VERSION" - E2E testing framework (or `playwright`).
-   `eslint`: "^LATEST_VERSION" - Linter for JavaScript and TypeScript.
-   `eslint-plugin-vue`: "^LATEST_VERSION" - ESLint plugin for Vue.
-   `jest`: "^LATEST_VERSION" - Testing framework (or `vitest`).
-   `nodemon`: "^LATEST_VERSION" - Utility to monitor for changes and restart the server.
-   `prettier`: "^LATEST_VERSION" - Code formatter.
-   `supertest`: "^LATEST_VERSION" - HTTP assertion library for testing Express APIs.
-   `ts-jest`: "^LATEST_VERSION" - Jest preprocessor for TypeScript (if using Jest).
-   `ts-node`: "^LATEST_VERSION" - Execute TypeScript directly.
-   `typescript`: "^LATEST_VERSION" - TypeScript compiler.
-   `vite`: "^LATEST_VERSION" - Alternative build tool for Vue.js (if not Vue CLI).
-   `vitest`: "^LATEST_VERSION" - Test runner for Vite projects (if using Vite).
-   `playwright`: "^LATEST_VERSION" - E2E testing framework.

*(LATEST_VERSION should be replaced with actual current stable versions at the time of creation)*

## Next Steps
1.  Decide on the project structure (single `package.json` vs. monorepo/multiple `package.json` files).
2.  Choose specific tooling where alternatives exist (e.g., Vue CLI vs. Vite, Jest vs. Vitest, Playwright).
3.  Initialize the `package.json` (`npm init -y` or similar).
4.  Install the listed dependencies and devDependencies with their current stable versions.
5.  Configure `tsconfig.json`, ESLint, Prettier, and testing frameworks. 