# Java-AST Integration and Analysis

This document outlines the details for integrating and using the `java-ast` library for parsing Java files and analyzing ASTs. 

## Overview

The `java-ast` library (presumably a TypeScript/JavaScript AST parsing tool for Java code) is critical for two main purposes within this project:

1.  **Step (1) Discovery of REST Annotations:** It is used to parse all `.java` files in the target Java project. The Abstract Syntax Trees (ASTs) generated are then traversed to identify common Java REST annotations (e.g., JAX-RS, Spring MVC) and extract associated metadata like file path, class name, method name, HTTP methods, endpoint paths, and JavaDocs.
2.  **Step (3) Call Hierarchy Refinement:** While the Java LSP provides the primary call hierarchy, `java-ast` is used to parse the method bodies identified by the LSP. This allows for a deeper analysis of control flow statements (e.g., `if-else`, `switch`, loops, `try-catch`) within those methods. This helps identify conditional calls and refine the call graph, providing context that the LSP alone might not offer regarding intra-method logic leading to calls.

This document details how `java-ast` will be invoked, how ASTs will be processed, and what information will be extracted.

## `java-ast` Invocation and Usage

Since `java-ast` is a TypeScript/JavaScript library, it will be integrated as a direct dependency in the Node.js application.

1.  **Installation & Setup:**
    *   The `java-ast` package will be added as a project dependency (e.g., via `npm install` or `yarn add`).
    *   It will be imported and used directly in the TypeScript code.

2.  **API Usage:**
    *   We will need to consult the `java-ast` library's documentation to understand its API for parsing Java source code (from strings or files) and for traversing the resulting AST.
    *   The library likely provides functions to parse a Java file content and return an AST object in JSON or a dedicated object structure.

3.  **Input/Output:**
    *   **Input:** The path to a specific `.java` file or its content as a string.
    *   **Output:** An AST representation (likely a JavaScript object or class instances) for the parsed Java code. The exact structure of this AST will depend on the `java-ast` library being used. We will need to study its output schema/API to effectively traverse and query it.

## AST Processing and Information Extraction

Once the AST is obtained, it needs to be traversed to find relevant information.

### 1. Discovering REST Annotations (Step 1)
*   **Traversal Logic:** Recursively walk the AST (e.g., visiting class declarations, method declarations, annotation nodes) using the API provided by the `java-ast` library.
*   **Annotation Identification:** Look for specific AST node types representing annotations. Match their names against a predefined list of common REST annotations:
    *   JAX-RS: `@Path`, `@GET`, `@POST`, `@PUT`, `@DELETE`, `@Produces`, `@Consumes`.
    *   Spring MVC: `@RestController`, `@Controller`, `@RequestMapping`, `@GetMapping`, `@PostMapping`, `@PutMapping`, `@DeleteMapping`.
*   **Metadata Extraction:** When a relevant annotation is found on a method or class:
    *   **File Path:** Known from the input to `java-ast`.
    *   **Class Name:** From the parent class declaration node.
    *   **Method Name:** From the method declaration node (if the annotation is on a method).
    *   **HTTP Method(s):** Determined from the type of annotation (e.g., `@GET` implies GET) or its attributes.
    *   **Endpoint Path/Pattern:** Extracted from annotation attributes (e.g., `value` attribute of `@Path` or `@RequestMapping`). Combine with class-level paths if present.
    *   **JavaDocs/Comments:** Extract comment nodes associated with the annotated method or class.
*   **Output Structure:** The extracted information for each endpoint will be compiled into a structured list of `DiscoveredEndpoint` objects (see `llm_types.ts`).

### 2. Analyzing Control Flow (Step 3)
*   **Targeted Parsing:** For a specific method identified by the LSP, its file content is parsed using `java-ast`.
*   **Method Body Traversal:** Navigate the AST to find the specific method's body using the library's AST traversal utilities.
*   **Control Flow Identification:** Identify AST nodes representing:
    *   Conditional statements: `IfStatement`, `SwitchStatement`.
    *   Loops: `ForStatement`, `WhileStatement`, `DoStatement`, `EnhancedForStatement`.
    *   Try-catch-finally blocks: `TryStatement`.
*   **Call Extraction within Branches:** Within each branch of a control flow statement, identify method invocation nodes (`MethodInvocation`).
    *   Extract the name of the called method and its arguments.
    *   This information helps annotate edges in the call hierarchy graph with conditions (e.g., a call to `service.doX()` only happens if `conditionA` is true).

## Key Files and Their Roles (TypeScript)

*   **`src/java-ast/ast_parser_service.ts`**: Contains the logic to interact with the `java-ast` library, traverse the AST, and extract meaningful information.
    *   **Class: `AstParserService`**
        *   **Constructor:** May take `java-ast` specific configuration or be initialized with the library instance if needed.
        *   **Methods:**
            *   `async parseFile(filePath: string): Promise<JavaAstNode>`: Reads a Java file and uses the `java-ast` library to parse its content into an AST structure (typed as `JavaAstNode`).
            *   `async parseFileContent(fileContent: string): Promise<JavaAstNode>`: Uses the `java-ast` library to parse a string content into an AST.
            *   `findRestEndpoints(fileAst: JavaAstNode, filePath: string): DiscoveredEndpoint[]`: Traverses the AST of a single file to find REST endpoints.
            *   `extractControlFlowDetails(methodNode: JavaAstNode): ControlFlowInfo`: Traverses a method's AST to extract conditional calls and control flow structures.
            *   `private visitNode(node: JavaAstNode, visitor: AstVisitor): void`: A generic AST traversal utility, possibly adapted to use the `java-ast` library's specific traversal mechanisms.
*   **`src/java-ast/java_ast_types.ts`**: Defines TypeScript interfaces for the structure of the AST produced by `java-ast` (if not provided by the library itself, or to create an abstraction layer) and for the extracted information.
    *   **Interfaces:**
        *   `JavaAstNode`: A base interface for an AST node, with properties like `type`, `name`, `children`, `attributes`, `value`, `comments`, etc. (This will need to be defined based on the actual structure provided by `java-ast`).
        *   Specific node types extending `JavaAstNode` (e.g., `ClassDeclarationNode`, `MethodDeclarationNode`, `AnnotationNode`, `IfStatementNode`).
        *   `DiscoveredEndpoint`: (Likely shared with `llm_types.ts`)
        *   `ControlFlowInfo`: Structure to hold conditional call information.
            *   `conditionalCalls: Array<{ condition: string; methodName: string; targetClass?: string; }>`
        *   `AstVisitor`: An interface for the visitor pattern used in `visitNode`.
*   **`src/config/java_ast_config.ts`**: Configuration related to `java-ast` usage (if any specific options are needed for the library).
    *   **Interface: `JavaAstConfig`** (This section might be removed or simplified if `java-ast` requires no specific configuration beyond direct API calls)
        *   `parserOptions?: object` // Example: options to pass to the `java-ast` parser functions.
    *   **Object: `defaultJavaAstConfig: JavaAstConfig`**

## Error Handling

*   **`java-ast` Library Errors:** Handle errors that the `java-ast` library might throw during parsing (e.g., for malformed Java code). These need to be caught and potentially reported to the user or logged.
*   **AST Traversal Errors:** Robustly handle unexpected AST structures or missing information during traversal.

## Testing Strategy

*   **`src/java-ast/ast_parser_service.ts` (`AstParserService`):**
    *   **Unit Tests (mocking `java-ast` library calls or using sample AST objects):**
        *   Verify `parseFile()` correctly reads files and calls the `java-ast` parsing function.
        *   Mock successful parsing: provide sample AST objects (as if returned by `java-ast`) and verify `findRestEndpoints()` and `extractControlFlowDetails()` work correctly.
        *   Mock parsing failures: simulate errors thrown by the `java-ast` library and verify error handling.
        *   For `findRestEndpoints()`:
            *   Provide various mock ASTs representing Java files with and without REST annotations (JAX-RS, Spring).
            *   Verify correct extraction of all `DiscoveredEndpoint` fields (path, class/method names, HTTP methods, comments).
        *   For `extractControlFlowDetails()`:
            *   Provide mock method body ASTs with various control flow structures (if/else, loops).
            *   Verify correct identification of method calls within different branches.
            *   Verify accurate representation of conditions.
        *   Test AST traversal logic with different tree depths and complexities.
*   **Integration Tests:**
    *   Test `AstParserService` by feeding it actual Java file content and using the real `java-ast` library.
        *   Focus on verifying that the `java-ast` library can parse sample Java files correctly and that the subsequent information extraction logic in `AstParserService` works as expected with the real AST structures.

This detailed plan should guide the implementation of the `java-ast` integration. Remember to consult the specific `java-ast` tool's documentation for its exact API usage and AST schema. 