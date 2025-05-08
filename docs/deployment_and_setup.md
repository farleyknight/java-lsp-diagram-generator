# Deployment and Setup

This document outlines the steps required to set up the development environment and deploy the Java LSP Diagram Generator application.

## Prerequisites

Before you begin, ensure you have the following installed:

*   **Node.js:** (Specify version, e.g., v18.x or later) - Required for running the backend and frontend.
*   **npm/yarn:** (Specify version if necessary) - For managing Node.js packages.
*   **Java Development Kit (JDK):** (Specify version, e.g., JDK 11 or later) - Required for the Java LSP server and the `java-ast` tool.
*   **`java-ast` tool:**
    *   Download the JAR file from [https://github.com/pascalgn/java-ast/releases](https://github.com/pascalgn/java-ast/releases) (Specify recommended version).
    *   Alternatively, provide instructions if it needs to be built from source.
*   **Java LSP Server:**
    *   Specify which Java LSP server is being used (e.g., Eclipse JDT LS).
    *   Provide download/setup instructions or link to its official documentation. (e.g., "Download from [link] or ensure it's included as a dependency if bundled").

## Configuration

The application uses `.env` files for managing environment-specific configurations.

1.  **Create a `.env` file** in the project root directory by copying the `.env.example` file (if one exists).
    ```bash
    cp .env.example .env
    ```

2.  **Edit the `.env` file** with the necessary values:

    ```env
    # Node.js/Express Server Configuration
    PORT=3000 # Port for the backend server

    # LLM (Claude) API Key
    ANTHROPIC_API_KEY=your_claude_api_key_here

    # Paths to Java tools
    JAVA_HOME=/path/to/your/jdk # Optional, if not set in system environment
    JAVA_AST_JAR_PATH=/path/to/java-ast.jar # Full path to the downloaded java-ast JAR
    LSP_SERVER_JAR_PATH=/path/to/lsp/server/jar # Full path to the LSP server JAR
    LSP_SERVER_CONFIG_PATH=/path/to/lsp/config # Optional: Path to LSP server configuration file/directory

    # Other configurations
    # Add any other environment variables required by the application
    ```

## Running the Application

### Backend (Express.js)

1.  Navigate to the backend directory (e.g., `cd server`).
2.  Install dependencies:
    ```bash
    npm install
    # or
    yarn install
    ```
3.  Run the backend server:
    ```bash
    npm start
    # or
    yarn start
    ```
    The server should now be running on the port specified in your `.env` file (e.g., `http://localhost:3000`).

### Frontend (Vue.js)

1.  Navigate to the frontend directory (e.g., `cd client`).
2.  Install dependencies:
    ```bash
    npm install
    # or
    yarn install
    ```
3.  Run the frontend development server:
    ```bash
    npm run serve
    # or
    yarn serve
    ```
    The Vue.js application should now be accessible in your browser (usually `http://localhost:8080` or similar, check terminal output).

## Test Fixture Setup

To effectively test the diagram generation, a sample Java project (test fixture) is required.

*   **Location:** (Specify where the test fixture project is located or how to obtain it, e.g., "Clone the `test-fixture-java-project` repository from [link] into a local directory.")
*   **Structure:** Briefly describe the expected structure of the test fixture if relevant (e.g., "Ensure it's a Maven/Gradle project with REST controllers...").
*   **Usage:** When prompted by the application, provide the absolute path to the root of this test fixture project.

## Building for Production (Placeholder)

Instructions for creating a production build of the frontend and backend.

```
# Frontend
cd client
npm run build
# or
yarn build

# Backend
cd server
# (Steps depend on deployment strategy, e.g., tsc for TypeScript compilation)
npm run build # If applicable
```

## Deployment (Placeholder)

Guidance on deploying the application to a server or cloud platform.
(e.g., using Docker, PM2, serverless functions, etc.) 