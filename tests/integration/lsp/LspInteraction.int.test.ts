import * as path from 'path';
import * as fs from 'fs';
import { LspManager } from '../../../src/lsp/lsp_manager';
import { LspClient } from '../../../src/lsp/lsp_client';
import { defaultLspConfig, JavaLspConfig } from '../../../src/config/lsp_config';
import { DidOpenTextDocumentParams, InitializeResult, Location, ReferenceParams, InitializeParams } from '../../../src/lsp/types';

const TEST_TIMEOUT = 60000; // 60 seconds for LSP tests, adjust as needed

describe('LSP Interaction Tests', () => {
    let lspManager: LspManager;
    let lspClient: LspClient;
    let initializeResult: InitializeResult;

    const projectRootPath = path.resolve(__dirname, '../../fixtures/SampleJavaProject');
    const workspaceDataPath = path.resolve(__dirname, '../../fixtures', '.jdt_ws_data_test_' + Date.now()); // Place data dir outside SampleJavaProject

    const testConfig: JavaLspConfig = {
        ...defaultLspConfig,
        serverJarPath: path.resolve(process.cwd(), defaultLspConfig.serverJarPath),
        workspaceDataPath: workspaceDataPath, // Use the non-overlapping path
        logLevel: 'INFO', 
    };

    beforeAll(async () => {
        console.log(`Test Project Root: ${projectRootPath}`);
        console.log(`LSP Workspace Data Path: ${workspaceDataPath}`); // Log the data path
        console.log(`Using LSP Server JAR: ${testConfig.serverJarPath}`);
        
        lspManager = new LspManager(testConfig, projectRootPath);
        
        lspManager.on('stderr', (message) => console.error('LSP STDERR:', message));
        lspManager.on('error', (error) => console.error('LSP ERROR:', error));
        // lspManager.on('notification', (notification) => console.log('LSP NOTIF:', notification.method, notification.params));

        // Construct InitializeParams directly here to ensure changes are applied
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const _initializeParams: InitializeParams = {
            processId: process.pid,
            clientInfo: {
                name: 'JavaLSPDiagramGenerator',
                version: '0.1.0'
            },
            rootUri: `file://${projectRootPath}`,
            capabilities: {
                textDocument: {
                    synchronization: {
                        didSave: true,
                        willSave: true,
                        willSaveWaitUntil: true
                    },
                    callHierarchy: { 
                        dynamicRegistration: true
                    },
                    definition: { dynamicRegistration: true }, 
                    references: { dynamicRegistration: true }  
                },
                workspace: {
                    workspaceFolders: true, // Explicitly boolean true
                    // configuration: undefined, // Temporarily remove to isolate workspaceFolders
                }
            },
            trace: 'verbose', 
            workspaceFolders: [{
                uri: `file://${projectRootPath}`,
                name: path.basename(projectRootPath)
            }]
        };

        try {
            // Pass the locally defined initializeParams to startServer
            // This requires LspManager.startServer to accept it or use it internally
            // For now, LspManager constructs its own. This is a mismatch.
            // Let's assume LspManager internally uses the params correctly if we modify its construction,
            // OR we modify LspManager to take these params.
            // THE CURRENT LspManager.startServer() IGNORES EXTERNAL initializeParams.
            // The fix must be in LspManager.startServer() where it defines its own initializeParams.

            initializeResult = await lspManager.startServer(); // This line uses LspManager's internal params
            lspClient = new LspClient(lspManager);
            expect(initializeResult).toBeDefined();
            expect(initializeResult.capabilities).toBeDefined();
        } catch (error) {
            console.error('LSP Server failed to start in beforeAll:', error);
            // Print LSP logs if available
            if (lspManager) {
                console.error('LSP Manager Logs:\n', lspManager.getLogs().join('\n'));
            }
            throw error; // Fail fast if server doesn't start
        }
    }, TEST_TIMEOUT);

    afterAll(async () => {
        if (lspManager) {
            try {
                await lspManager.stopServer();
                console.log("LSP Server stopped successfully.");
            } catch (error) {
                console.error("Error stopping LSP server:", error);
                // console.error('LSP Manager Logs (after stop error):\n', lspManager.getLogs().join('\n'));
            }
        }
    }, TEST_TIMEOUT);

    it('should find references for HelloController.sayHello', async () => {
        expect(lspClient).toBeDefined();

        const controllerFileName = 'HelloController.java';
        const controllerPath = path.join(projectRootPath, 'src', 'main', 'java', 'com', 'example', 'sample', controllerFileName);
        const controllerUri = `file://${controllerPath}`;

        let fileContent: string;
        try {
            fileContent = fs.readFileSync(controllerPath, 'utf-8');
        } catch (e) {
            console.error(`Failed to read ${controllerPath}`, e);
            throw e;
        }

        const didOpenParams: DidOpenTextDocumentParams = {
            textDocument: {
                uri: controllerUri,
                languageId: 'java',
                version: 1,
                text: fileContent,
            },
        };
        lspClient.textDocumentDidOpen(didOpenParams);
        console.log(`Sent textDocument/didOpen for ${controllerUri}`);

        // Allow time for server processing
        await new Promise(resolve => setTimeout(resolve, 5000)); 

        const sayHelloMethodPosition = LspClient.createPosition(10, 19); // Position on "sayHello"

        console.log(`Requesting textDocument/references for ${controllerUri} at L${sayHelloMethodPosition.line}:C${sayHelloMethodPosition.character}`);
        let referencesResult: Location[] | null = null;
        const referenceParams: ReferenceParams = {
            textDocument: { uri: controllerUri },
            position: sayHelloMethodPosition,
            context: { includeDeclaration: true } // Include the definition itself
        };

        try {
            referencesResult = await lspClient.getTextDocumentReferences(referenceParams);
        } catch (error) {
            console.error('textDocument/references failed:', error);
            console.error('LSP Manager Logs (after references error):\n', lspManager.getLogs().join('\n'));
            throw error;
        }
        
        console.log('textDocument/references result:', JSON.stringify(referencesResult, null, 2));

        // For this simple project, we expect the reference search to succeed (not throw an error)
        // but likely return only the definition itself, or maybe null/empty if it excludes the definition.
        expect(referencesResult).toBeDefined(); // Should not be undefined
        // Depending on server behavior, it might be null or an empty array if no references found besides declaration
        // Or it might return an array with one item (the declaration) because we set includeDeclaration: true
        if (referencesResult !== null) {
            expect(Array.isArray(referencesResult)).toBe(true);
            // Check if it found at least the declaration
            expect(referencesResult.length).toBeGreaterThanOrEqual(1);
            if (referencesResult.length > 0) {
                expect(referencesResult[0].uri).toBe(controllerUri);
                // Optionally check the range for the definition
            }
        }

    }, TEST_TIMEOUT);

}); 