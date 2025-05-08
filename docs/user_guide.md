# User Guide

This guide provides instructions on how to use the Java LSP Diagram Generator to create sequence diagrams from your Java REST endpoints.

## Getting Started

Before using the application, please ensure you have completed the setup steps outlined in the [Deployment and Setup](./deployment_and_setup.md) document. This includes configuring paths to your Java project, `java-ast.jar`, and the LSP server JAR.

## Generating Your First Diagram

1.  **Launch the Application:**
    *   Start the backend server (Express.js).
    *   Start the frontend development server (Vue.js).
    *   Open the application in your web browser (typically `http://localhost:8080`).

2.  **Input Project Details:**
    *   On the main page, you will see input fields for:
        *   **Java Project Path:** Enter the absolute file system path to the root directory of your Java project (the one you want to analyze).
        *   **Endpoint Query:** Enter a natural language query to describe the REST endpoint you are interested in. 
            *   Examples:
                *   "Show the user login flow"
                *   "Generate a diagram for creating a new order"
                *   "What happens when I request `/api/products/{id}`?"
                *   "Diagram the `ProductController.getProductDetails` method"

3.  **Generate Diagram:**
    *   Click the "Generate Diagram" (or similarly named) button.
    *   A loading indicator will appear while the application processes your request. This involves:
        *   Discovering all REST endpoints in your project.
        *   Using an LLM to understand your query and match it to a discovered endpoint.
        *   Analyzing the call hierarchy starting from that endpoint.
        *   Generating the Mermaid sequence diagram syntax via an LLM.

4.  **Disambiguation (If Necessary):**
    *   If your query is ambiguous and could refer to multiple discovered REST endpoints, a list of choices will be presented.
    *   Each choice will provide a description of the endpoint (e.g., HTTP method, path, class/method name).
    *   Review the options and select the one that best matches your intent.
    *   Click "Confirm Selection" (or similarly named button).
    *   The application will then proceed to generate the diagram for your selected endpoint.

5.  **View Diagram:**
    *   Once processing is complete, the generated sequence diagram will be displayed on the page.
    *   The diagram is rendered using Mermaid.js.

## Interacting with the Diagram

*   **Copy Mermaid Syntax:**
    *   Look for a "Copy Syntax" or "Copy Mermaid Code" button.
    *   Clicking this will copy the raw Mermaid text syntax to your clipboard. You can use this in other tools or documents that support Mermaid.
*   **Download Diagram (Optional Feature):**
    *   If available, there might be options to download the diagram as an SVG image or other formats.
*   **View Raw Syntax (Especially on Error):**
    *   If the diagram fails to render correctly, there might be an option to view the raw Mermaid syntax that was generated. This can be helpful for debugging issues with the LLM's output.

## "Talk to the Diagram" Feature (Iterative Refinement)

Once an initial diagram is generated, you can use the "Talk to the Diagram" feature to modify or refine it conversationally.

*   **Chat Interface:** A chat input field will be available near the diagram.
*   **Making Requests:** Type commands or questions to modify the diagram. Examples:
    *   "Remove the `LoggerService`."
    *   "What if the call to `PaymentService.processPayment()` fails? Show that alternative path."
    *   "Highlight all interactions involving `OrderController`."
    *   "Simplify the diagram to only show `UserService` and `DatabaseService`."
    *   "Expand details for the `AuthService.authenticate()` call."
*   **Diagram Updates:** After each command, the LLM will interpret your request, the underlying diagram data will be updated, and the diagram will be re-rendered.

## Troubleshooting

*   **Diagram Not Rendering / Errors:**
    *   Check the raw Mermaid syntax for obvious errors.
    *   Ensure the backend server and all its components (LSP, `java-ast`) are running and configured correctly.
    *   Look for error messages displayed in the UI or in the browser's developer console.
    *   Check the backend server logs for more detailed error information.
*   **Incorrect Endpoint Chosen:**
    *   Try rephrasing your initial query to be more specific.
    *   If disambiguation choices were offered, ensure you selected the correct one.
*   **Performance Issues with Large Projects:**
    *   Refer to the [Scalability and Performance](./scalability_and_performance.md) document for potential causes and tips.
    *   Be patient, as analysis of large projects can take time.

This guide covers the basic usage of the application. Refer to other documents in the `docs/` directory for more detailed technical information on specific components. 