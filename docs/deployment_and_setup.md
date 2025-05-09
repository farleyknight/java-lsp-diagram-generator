# Deployment and Setup

This document outlines the steps required to set up the development environment and deploy the Java LSP Diagram Generator application.

## Prerequisites

Before you begin, ensure you have the following installed:

*   **Node.js:** v18.0.0 or later (as per `package.json` `engines` field). A specific Long-Term Support (LTS) version (e.g., v20.x.x) is recommended for stability. Please specify the version you are using here: `v23.11.0`
*   **npm/yarn:** (Specify version if necessary, usually comes with Node.js)
*   **Java Development Kit (JDK):** JDK 11 or later (e.g., JDK 17, 21). Ensure it is compatible with the Java projects you intend to analyze. Please specify the version you are using for projects here: `JDK 17`
*   **`java-ast` tool:**
    *   Download a specific JAR file version from [https://github.com/pascalgn/java-ast/releases](https://github.com/pascalgn/java-ast/releases) (e.g., v1.10.0). Document the chosen version here: `v0.4.0`.
    *   The `JAVA_AST_JAR_PATH` in your `.env` file must point to this downloaded JAR.
*   **Java LSP Server:**
    *   **Server Used:** Eclipse JDT LS ([https://github.com/eclipse-jdtls/eclipse.jdt.ls](https://github.com/eclipse-jdtls/eclipse.jdt.ls))
    *   **Installation:** The `scripts/install-lsp.sh` script downloads the latest available snapshot of Eclipse JDT LS. This means the exact version can vary if the script is re-run later. The downloaded server files are placed in the `bin/eclipse.jdt.ls` directory.
    *   **Runtime JDK for JDT LS:** Requires Java 21 or later to run the LSP server itself. Ensure this is installed and accessible.
    *   **Project JDK Compatibility:** Eclipse JDT LS can analyze projects using JDK versions from 1.8 through 24. The JDK version specified above for your projects should be compatible.
    *   **Manual Download/Setup (Alternative to script):** Milestone builds can be downloaded from [http://download.eclipse.org/jdtls/milestones/](http://download.eclipse.org/jdtls/milestones/). These are typically packaged as archives (e.g., `jdt-language-server-<version>.tar.gz` or `.zip`). If setting up manually, extract the archive and configure the `LSP_SERVER_JAR_PATH` in your `.env` file to point to the `plugins/org.eclipse.equinox.launcher_<VERSION>.jar` within the extracted directory.

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