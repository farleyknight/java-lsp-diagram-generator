# Project Overview

Our goal is to write a Node.js TypeScript based application.

It will contain a web UI using Express & Vue.

It will interact with a test fixture. The test fixture will be a fully-fledged java project.

The java project will serve as a way to test our ability to generate mermaid sequence diagrams that follow REST annotations, and show the Request/Response cycle for these REST applications.

## Tools:

1.  We will be using a Java LSP to investigate the Java code.
    *   **Specific Example:** While the implementation aims to be compatible with standard LSP features, development and testing will primarily use **Eclipse JDT LS** as the reference Java LSP server. Configuration details and interactions will be based on its behavior.
2.  We will also be using `java-ast` (https://github.com/pascalgn/java-ast/)
    *   **Specific Tool:** The project will use the `java-ast` tool from **`pascalgn/java-ast`** (specifically, version X.Y.Z or latest recommended should be used - check `docs/deployment_and_setup.md` for exact version). This tool is used for its capability to parse Java source into a JSON AST format.

We will be using tools (1) and (2) to generate the mermaid sequence diagrams.

The Java LSP will be primarily to determine the call hierachy at the point at which the REST endpoint starts, and then continue recursing searching through the call hierarchy (but always staying within the project source code and avoiding standard library or extrernal dependencies) to branch out all of the calls involved with the Request/Response cycle.

We will be using the `java-ast` to do everything else. The main phases are:

**LLM Assumption:** We will assume the primary LLM for tasks requiring natural language understanding or generation (such as disambiguation and diagram generation) is **Claude**. API access will be managed via Anthropic keys, which are expected to be present in an `.env` file in the project root (e.g., `ANTHROPIC_API_KEY=your_key_here`).

### Step (0) Prompt
The user prompts the Chat Bot to generate a diagram based on a particular REST endpoint.

#### Technical Details:
*   **Interaction Channel:** The user will interact with the application via a web UI (built with Express and Vue).
*   **User Input:** The user will provide:
    *   The path or URL to the Java project's root directory.
    *   A natural language query specifying the target REST endpoint. This could be a direct path (e.g., "`/api/users/{id}` with GET method") or a descriptive query (e.g., "generate a diagram for the user login endpoint").

### Step (1) Discovery
Find all of the REST annotations in the given Java repo.

#### Technical Details:
*   **Tooling:** Use `java-ast` to parse all `.java` files within the specified Java project.
*   **Annotation Identification:** Scan the ASTs for common Java REST annotations, such as:
    *   JAX-RS: `@Path`, `@GET`, `@POST`, `@PUT`, `@DELETE`, `@Produces`, `@Consumes`.
    *   Spring MVC: `@RestController`, `@Controller`, `@RequestMapping`, `@GetMapping`, `@PostMapping`, `@PutMapping`, `@DeleteMapping`.
*   **Information Extraction:** For each identified endpoint, extract:
    *   File path.
    *   Class name.
    *   Method name.
    *   HTTP method(s).
    *   Endpoint path/pattern.
    *   Relevant comments or JavaDocs associated with the method or class.
*   **Output:** A structured list (e.g., JSON array) of discovered endpoint objects, each containing the extracted information. This list will serve as input for the disambiguation step.

### Step (2) Disambiguation
Given the prompt, determine which of the REST endpoints the user is referring to.

#### Technical Details:
*   **Input:**
    *   The user's natural language query (from Step 0).
    *   The list of discovered REST endpoints (from Step 1).
*   **Process:**
    *   Employ an LLM (Claude) to perform semantic matching between the user's query and the details of each discovered endpoint (including path, method, class/method names, and associated comments/JavaDocs).
    *   The prompt to the LLM will ask it to identify the most relevant endpoint(s) from the provided list based on the user's query.
*   **Ambiguity Resolution:**
    *   If the LLM identifies a single, high-confidence match, proceed with that endpoint.
    *   If there are multiple plausible matches or the confidence is low, the web UI will present the potential matches to the user, allowing them to select the correct one.
*   **Output:** The specific REST endpoint (from the discovered list) that the user intends to analyze.

### Step (3) Call Hierarchy
Starting with the REST endpoint we want to understand, we recursively search the call hierarchy to find out what methods are calling which. As we recurse, we are careful not to search for method calls that are either in the standard library or the external libraries. We are only interested in other classes/methods in the same project. We build a tree of the call hierarchy, using Java LSP. But we must also take into account branching (if/else) when we search the call hierarchy. So we must also use `java-ast` to understand the same code as we find in the Java LSP. Once we've built ths data structure, we can hand it off to the LLM to do step (4).

#### Technical Details:
*   **Input:** The disambiguated REST endpoint method (from Step 2).
*   **LSP for Call Hierarchy:**
    *   Initialize a Java LSP client connected to the user's project.
    *   Use `textDocument/definition` to find the precise location of the selected endpoint method.
    *   Starting from this method, recursively use `callHierarchy/outgoingCalls` to trace method calls.
    *   **Filtering:** At each step, filter out calls to methods that are not part of the project's source code. This involves inspecting the file path of the called method's definition and excluding common Java standard library packages (e.g., `java.*`, `javax.*`) and known third-party library namespaces.
*   **`java-ast` for Control Flow and Refinement:**
    *   For each method identified by the LSP as part of the call chain within the project:
        *   Parse the method's body using `java-ast`.
        *   Identify control flow statements (e.g., `if-else`, `switch`, `for`, `while`, `try-catch-finally`).
        *   Analyze method calls within different branches of these control flow statements.
        *   This helps in understanding conditional calls and refining the call graph generated by the LSP, which might not fully detail intra-method control flow leading to calls.
*   **Data Structure:**
    *   Construct a graph (or tree) where each node represents a method within the project involved in handling the request.
    *   Nodes will store: class name, method name, method signature, file path, and relevant line numbers.
    *   Edges will represent a method call from one method to another.
    *   Edges can be annotated with conditions derived from `java-ast` analysis (e.g., an edge exists if a certain `if` condition is met).
    *   Example Node: `{ "id": "com.example.UserService.getUser", "class": "UserService", "method": "getUser(String id)", "file": "src/main/java/com/example/UserService.java", "lines": [25, 40] }`
    *   Example Edge: `{ "callerId": "com.example.UserController.getUserById", "calleeId": "com.example.UserService.getUser", "condition": "if (userIsAuthenticated)" }`
*   **Output:** A structured representation (e.g., JSON) of the call hierarchy graph, including control flow information.

### Step (4) Generate the Mermaid Sequence Diagram
This data structure is fed into the LLM and it is tasked with creating a mermaid sequence diagram from the structure.

#### Technical Details:
*   **Input:**
    *   The structured call hierarchy graph (from Step 3).
    *   Details of the initial REST endpoint (e.g., HTTP method, path).
*   **LLM (Claude) Prompting:**
    *   Construct a detailed prompt for Claude, providing the call hierarchy data.
    *   The prompt will instruct Claude to generate a Mermaid sequence diagram.
    *   Key instructions for the LLM:
        *   Participants in the sequence diagram should primarily be the Java classes involved.
        *   Represent method calls between these classes.
        *   Incorporate conditional logic (e.g., `alt`, `opt` blocks in Mermaid) based on the conditional call information from the input graph.
        *   The diagram should start with an external actor initiating the request to the REST endpoint.
        *   Clearly show the request flow and any response propagation if inferable.
    *   Example prompt fragment: "Generate a Mermaid sequence diagram for a `GET /api/orders/{id}` request. The following JSON describes the call hierarchy and conditional logic: [JSON data from Step 3]. Participants should be classes. Show method calls. Use `alt` for conditional paths based on the 'condition' fields."
*   **Output Processing:**
    *   Receive the Mermaid diagram syntax (string) from Claude.
    *   Optional: Perform basic validation of the Mermaid syntax.
*   **Display:** Render the Mermaid diagram in the web UI, allowing the user to view and copy the diagram.

## "Talk to the Diagram" Feature

Beyond initial generation, a key enhancement is the "Talk to the Diagram" feature, allowing users to conversationally refine the diagram. Details are in [`docs/talk_to_the_diagram.md`](./talk_to_the_diagram.md).

## Future Enhancements/Roadmap (Potential)

While the core focus is on generating sequence diagrams from Java REST endpoints and enabling conversational refinement, several areas could be explored for future enhancements:

*   **Broader Language Support:**
    *   Extend analysis capabilities to other backend languages (e.g., Python/Django/Flask, C#/.NET, Ruby/Rails, Node.js/Express itself).
    *   This would require alternative LSP servers and AST parsing tools for each language.

*   **Different Diagram Types:**
    *   Support for generating other types of diagrams from the call hierarchy or AST analysis (e.g., component diagrams, dependency graphs, UML class diagrams).
    *   Investigate LLM capabilities to translate the same underlying data into different diagramming syntaxes (e.g., PlantUML).

*   **Enhanced Diagram Interactivity (Beyond Mermaid Native):**
    *   Deeper integration with diagram elements: e.g., clicking a method call in the diagram navigates to the source code (requires IDE integration or more sophisticated frontend linking).
    *   Allowing users to manually edit/rearrange diagram elements, with changes potentially feeding back into the underlying data or LLM context.

*   **IDE Integration:**
    *   Develop a plugin for popular Java IDEs (e.g., IntelliJ IDEA, VS Code with Java Extension Pack) to trigger diagram generation directly from the IDE context.
    *   Display diagrams within an IDE panel.

*   **Batch Processing and Documentation Generation:**
    *   Allow users to select multiple endpoints or even entire modules to generate a set of diagrams, potentially for embedding into project documentation.

*   **More Sophisticated Analysis:**
    *   Deeper static analysis to infer data flow or state changes.
    *   Integration with runtime analysis tools or logs to compare static diagrams with actual runtime behavior.

*   **Support for Asynchronous Operations:**
    *   Improve representation of asynchronous calls, message queues, or event-driven architectures in sequence diagrams.

*   **User Accounts and Saved Diagrams:**
    *   If deployed as a shared service, allow users to save, manage, and share their generated diagrams.

*   **Advanced Configuration Options:**
    *   More granular controls for filtering (e.g., exclude specific packages/classes even if in project, set custom depth limits for call hierarchy).

*   **Alternative LLMs:**
    *   Provide flexibility to switch between different LLMs if needed, abstracting the LLM interaction layer.

This list represents potential future directions and would require significant effort beyond the current project scope. 