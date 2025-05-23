# Mermaid Diagram Management & Rendering

This document outlines the details for managing and rendering Mermaid sequence diagrams generated by the LLM. 

## Overview

Once the LLM (Claude) generates the Mermaid sequence diagram syntax (Step 4 of the main project overview), this module is responsible for:

1.  **Receiving the Syntax:** Accepting the Mermaid string from the LLM interaction service.
2.  **Optional Validation:** Performing basic checks on the syntax to catch obvious errors before attempting to render.
3.  **Rendering:** Displaying the visual diagram in the web UI (Vue.js frontend).
4.  **User Utilities:** Providing functionality for the user to interact with the diagram (e.g., copy syntax, download).

## Mermaid Syntax Handling

### 1. Receiving from LLM Service
*   The `ClaudeService` (or a similar LLM interaction module) will return the Mermaid diagram as a multi-line string.
*   This string is passed to the backend (Express.js) API endpoint, which then forwards it to the frontend (Vue.js) client.

### 2. Syntax Validation (Optional)
*   **Purpose:** To provide early feedback if the LLM generates malformed Mermaid syntax, potentially reducing user confusion or rendering errors.
*   **Client-Side vs. Server-Side:** Basic validation could occur on either the server (before sending to client) or the client (before attempting to render).
    *   Client-side might be more immediate for UI feedback.
*   **Methods:**
    *   **Simple Checks:** Look for common structural elements like `sequenceDiagram` declaration, participant declarations, and message arrows. This would not be a full parse but could catch gross errors.
    *   **Using Mermaid.js API (Client-Side):** The Mermaid.js library itself might offer a parse or validation function that can be called without fully rendering. If `mermaid.parseError` is thrown during `mermaid.render()`, that implicitly serves as validation.
*   **Error Handling:** If validation fails, display a user-friendly message indicating that the diagram syntax might be incorrect and perhaps show the raw syntax for debugging.

## Rendering in the Web UI (Vue.js)

The Vue.js frontend is responsible for rendering the Mermaid diagram.

### 1. Integration with Mermaid.js
*   **Library:** The core `mermaid.js` library will be used.
*   **Installation:** Include `mermaid.js` as a project dependency (`npm install mermaid` or `yarn add mermaid`).
*   **Vue Component (`DiagramDisplay.vue` or similar):**
    *   **Props:** This component will accept the `mermaidSyntax: string` as a prop.
    *   **Rendering Logic:**
        1.  Import `mermaid` from the library.
        2.  Initialize Mermaid.js (e.g., `mermaid.initialize({ startOnLoad: false, theme: 'default' });`). This is typically done once when the application or component mounts.
        3.  When the `mermaidSyntax` prop changes (or is received):
            *   Target a `<div>` element within the component to render the diagram into.
            *   Use `mermaid.render(elementId, mermaidSyntax, callback)` to generate the SVG.
            *   The `callback` function receives the SVG code and can be used to inject it into the target `<div>`. Handle any errors thrown by `mermaid.render()` (e.g., `mermaid.parseError`).
    *   **Example (`DiagramDisplay.vue` snippet):**
        ```vue
        <template>
          <div class="mermaid-container">
            <div v-if="error" class="error-message">{{ error }}</div>
            <div :id="diagramId" ref="mermaidChart"></div>
            <pre v-if="showRawSyntax">{{ mermaidSyntax }}</pre>
          </div>
        </template>

        <script setup>
        import { ref, onMounted, watch, nextTick } from 'vue';
        import mermaid from 'mermaid';

        const props = defineProps({
          mermaidSyntax: {
            type: String,
            required: true
          }
        });

        const diagramId = ref(`mermaid-diagram-${Date.now()}-${Math.random().toString(36).substring(2)}`);
        const mermaidChart = ref(null);
        const error = ref(null);
        const showRawSyntax = ref(false); // Controlled by a button or on error

        onMounted(() => {
          mermaid.initialize({ startOnLoad: false, theme: 'neutral' }); // Or other themes
          renderDiagram();
        });

        watch(() => props.mermaidSyntax, () => {
          renderDiagram();
        });

        async function renderDiagram() {
          if (!props.mermaidSyntax || !mermaidChart.value) return;
          error.value = null;
          showRawSyntax.value = false;
          try {
            // Ensure the DOM element is ready and clean for re-renders
            mermaidChart.value.innerHTML = ''; // Clear previous diagram
            // Use nextTick to ensure DOM is updated before mermaid tries to find the element
            await nextTick();
            const { svg } = await mermaid.render(diagramId.value, props.mermaidSyntax);
            if (mermaidChart.value) {
                mermaidChart.value.innerHTML = svg;
            }
          } catch (e) {
            console.error("Mermaid rendering error:", e);
            error.value = `Error rendering diagram: ${e.message}. You can view the raw syntax.`;
            showRawSyntax.value = true; // Show raw syntax on error
          }
        }
        </script>

        <style scoped>
        .mermaid-container {
          /* Style as needed */
        }
        .error-message {
          color: red;
          margin-bottom: 10px;
        }
        </style>
        ```

### 2. Styling and Configuration
*   **Themes:** Mermaid.js supports themes (e.g., `default`, `neutral`, `dark`, `forest`). This can be configured during `mermaid.initialize()`.
*   **Custom Styling:** CSS can be used to style the container of the Mermaid diagram and potentially some aspects of the diagram itself (though Mermaid controls most of the SVG styling).

## User Utilities

Within the `DiagramDisplay.vue` component or surrounding UI, provide utilities for the user:

*   **Copy Mermaid Syntax:**
    *   A button that, when clicked, copies the raw `mermaidSyntax` string to the user's clipboard.
    *   Use the `navigator.clipboard.writeText()` API.
*   **Download Diagram (Optional):**
    *   **SVG:** The generated diagram is already SVG. A "Download SVG" button could create a data URI from the SVG string and trigger a download.
    *   **PNG/JPEG:** Converting SVG to a raster format (PNG/JPEG) client-side can be complex. It might involve drawing the SVG onto a `<canvas>` and then exporting from the canvas. Alternatively, this could be a server-side feature if high fidelity is needed.
*   **Toggle Raw Syntax View:** A button to show/hide the raw Mermaid syntax, especially useful if there's a rendering error.

## Key Files and Their Roles

*   **`client/src/components/DiagramDisplay.vue`**: The primary Vue component responsible for rendering the Mermaid diagram and providing user utilities (as detailed above).
*   **`client/src/services/mermaid_service.ts` (Optional):** If rendering logic becomes complex or needs to be shared, it could be abstracted into a service or composable used by `DiagramDisplay.vue`.
    *   **Functions:** `initializeMermaid()`, `renderMermaid(element, syntax): Promise<string (svg)>`.

## Testing Strategy

*   **`client/src/components/DiagramDisplay.vue`:**
    *   **Unit Tests (Vue Test Utils):**
        *   Mock the `mermaid.js` library heavily.
        *   Test that the component calls `mermaid.initialize` on mount.
        *   Test that `mermaid.render` is called with the correct syntax when the `mermaidSyntax` prop is provided or changes.
        *   Verify that the SVG output from a mocked `mermaid.render` is correctly injected into the component's template.
        *   Simulate `mermaid.render` throwing an error and verify that an error message is displayed and raw syntax becomes visible.
        *   Test UI interactions: e.g., clicking a "Copy Syntax" button calls `navigator.clipboard.writeText` with the correct syntax (mocking `navigator.clipboard`).
        *   Test prop validation.
    *   **Visual Regression Tests (Optional, with tools like Percy or Storybook):**
        *   For a few sample valid Mermaid syntaxes, ensure the diagram renders as expected visually.
*   **Client-Side `mermaid_service.ts` (if created):**
    *   **Unit Tests:** Test its functions with mocked `mermaid.js` calls, verifying correct parameter passing and handling of results/errors.

This plan covers the main aspects of integrating and managing Mermaid diagrams within the application. The example Vue component provides a practical starting point for implementation. 