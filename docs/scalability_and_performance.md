# Scalability and Performance

This document discusses considerations for scalability and performance of the Java LSP Diagram Generator, particularly when dealing with large Java projects.

## Overview

The application involves several computationally intensive steps:

1.  **Project-wide AST Parsing (Step 1 - Discovery):** `java-ast` parses all Java files.
2.  **LSP Interaction (Step 3 - Call Hierarchy):** LSP server analyzes the project and responds to queries like `callHierarchy/outgoingCalls`.
3.  **Repeated AST Parsing (Step 3 - Control Flow Refinement):** `java-ast` parses individual method bodies within the call hierarchy.
4.  **LLM Interaction (Steps 2 & 4):** API calls to Claude for disambiguation and diagram generation.

Performance bottlenecks in any of these areas can significantly impact user experience, especially for large codebases.

## Potential Bottlenecks and Challenges

(Referenced from `challenges.md` and general considerations)

*   **`java-ast` Performance:**
    *   Initial project-wide scan can be slow for projects with thousands of files.
    *   Repeated parsing of the same files/methods if not cached.
*   **LSP Server Performance:**
    *   Some LSP calls can be slow on large projects (e.g., deep call hierarchy recursion, finding references across many files).
    *   LSP server startup time and memory footprint.
    *   Filtering out-of-project calls efficiently.
*   **LLM API Latency & Rate Limits:**
    *   Network latency to Claude API.
    *   Processing time by the LLM itself, especially with large context (long lists of endpoints, complex call graphs).
    *   Hitting API rate limits.
*   **Node.js Backend Performance:**
    *   Single-threaded nature of Node.js means long-running synchronous tasks or CPU-intensive operations in the main thread can block other requests.
    *   Memory management for large data structures (ASTs, call graphs).
*   **Frontend Rendering:**
    *   Mermaid.js rendering complex diagrams in the browser.

## Strategies for Optimization and Scalability

### 1. Caching

*   **`java-ast` Results:**
    *   Cache ASTs or extracted endpoint information from the initial project scan. Invalidate cache based on file modification timestamps.
    *   Cache control flow information extracted from method bodies.
*   **LSP Results:**
    *   Investigate if the LSP server has internal caching. 
    *   Cache results of expensive LSP queries if they are likely to be re-requested and the underlying source code hasn't changed significantly. This needs careful consideration of cache invalidation.
*   **LLM Disambiguation Choices:**
    *   For a given project path and user query, if disambiguation choices were presented, cache these to avoid re-querying the LLM if the user revisits or makes a quick follow-up.

### 2. Efficient Data Handling

*   **Selective Parsing/Analysis:**
    *   For initial discovery, explore options to target specific source directories if a project has a standard layout (e.g., `src/main/java`).
    *   For control flow, only parse method bodies that are actually part of the in-project call hierarchy.
*   **Data Minimization for LLM:**
    *   Send only necessary information to the LLM. For example, for disambiguation, trim down JavaDocs or other metadata if it exceeds context limits, prioritizing key information like paths and method names.
    *   For diagram generation, simplify the call graph if it's excessively large, or consider asking the LLM to generate a summary diagram first.
*   **Streaming/Partial Results (Advanced):**
    *   If possible, stream results back to the UI (e.g., show discovered endpoints as they are found, render parts of a diagram as they are generated). This is complex to implement.

### 3. Asynchronous Operations and Concurrency

*   **Non-Blocking I/O:** Leverage Node.js's asynchronous nature for all I/O-bound operations (file system access, LSP communication, LLM API calls).
*   **Worker Threads (for CPU-bound tasks):**
    *   If certain data transformations or parts of AST processing (after `java-ast` provides the JSON) become CPU bottlenecks in Node.js, consider moving them to worker threads to avoid blocking the main event loop.
*   **LSP Server Resource Management:** Ensure the LSP server is configured with adequate memory.

### 4. Optimizing Tool Interactions

*   **`java-ast` CLI Options:** Explore `java-ast` CLI options for performance (e.g., disabling features not needed for our use case).
*   **LSP Initialization:** Ensure LSP is initialized efficiently. Only open necessary files with `textDocument/didOpen`.
*   **Call Hierarchy Depth:** Implement a configurable maximum recursion depth for call hierarchy analysis to prevent runaway analysis in very complex or cyclical codebases.

### 5. Frontend Performance

*   **Debounce/Throttle UI Updates:** For user inputs that trigger backend calls.
*   **Virtualization for Large Lists:** If displaying very large lists of disambiguation choices (though ideally, LLM reduces this).
*   **Optimize Mermaid Rendering:** Ensure `DiagramDisplay.vue` efficiently handles re-renders. See `mermaid_diagram_management.md` for initial implementation.

### 6. Configuration and User Guidance

*   Allow users to specify sub-directories for analysis if their project is very large and they only care about a specific module.
*   Provide clear feedback to the user during long-running operations.

## Metrics and Monitoring (Future Consideration)

*   To understand real-world performance, instrument the application to log timings for key operations:
    *   Time taken for Step 1 (Discovery).
    *   Time taken for each LSP call in Step 3.
    *   Time taken for `java-ast` refinement in Step 3.
    *   Time taken for LLM API calls.
*   This data can help identify actual bottlenecks in different projects.

This document provides a starting point for addressing scalability and performance. Specific strategies will need to be implemented and tested iteratively. 