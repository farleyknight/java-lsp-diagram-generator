import * as path from 'path';
import * as fs from 'fs';
import { URI } from 'vscode-uri';
import { LspManager } from '../../src/lsp/lsp_manager';
import { LspClient } from '../../src/lsp/lsp_client';
import {
    DocumentUri,
    DidOpenTextDocumentParams,
    InitializeResult, // Keep InitializeResult to get legend
    SemanticTokensParams,
    SemanticTokens,
    SemanticTokensLegend
} from '../../src/lsp/types';
import { JavaLspConfig, defaultLspConfig } from '../../src/config/lsp_config';

const workspaceRoot = process.cwd();
const sampleProjectPath = path.resolve(workspaceRoot, 'tests/fixtures/SampleJavaProject');
const helloControllerPath = path.resolve(sampleProjectPath, 'src/main/java/com/example/sample/HelloController.java');

const testLspConfig: JavaLspConfig = {
    ...defaultLspConfig,
    serverJarPath: path.resolve(process.cwd(), defaultLspConfig.serverJarPath),
    workspaceDataPath: path.resolve(sampleProjectPath, '.jdt_ws_data_e2e_semantic_tokens'), // Changed data path name
    logLevel: 'INFO',
};

// Helper interface for decoded tokens
interface DecodedSemanticToken {
    line: number;
    startChar: number;
    length: number;
    tokenType: string; // Name from legend
    tokenModifiers: string[]; // Names from legend
}

describe('E2E REST Annotation Discovery via Semantic Tokens', () => {
    let lspManager: LspManager;
    let lspClient: LspClient;
    let isLspInitialized = false;
    let semanticTokensLegend: SemanticTokensLegend | null = null;

    jest.setTimeout(60000);

    beforeAll(async () => {
        if (!fs.existsSync(testLspConfig.serverJarPath)) {
            console.error(`LSP Server JAR not found at: ${testLspConfig.serverJarPath}.`);
            throw new Error('LSP Server JAR not found. Cannot run E2E tests.');
        }
        if (!fs.existsSync(sampleProjectPath)) {
            throw new Error(`Sample project not found at: ${sampleProjectPath}`);
        }
        if (!fs.existsSync(helloControllerPath)) {
            throw new Error(`HelloController.java not found at: ${helloControllerPath}`);
        }
        if (fs.existsSync(testLspConfig.workspaceDataPath!)) {
            console.log(`Cleaning up old workspace data path: ${testLspConfig.workspaceDataPath}`);
            fs.rmSync(testLspConfig.workspaceDataPath!, { recursive: true, force: true });
        }
        
        lspManager = new LspManager(testLspConfig, sampleProjectPath);
        lspClient = new LspClient(lspManager);

        try {
            console.log('Starting LSP server for E2E semantic tokens test...');
            const initResult: InitializeResult = await lspManager.startServer();
            expect(initResult).toBeDefined();
            expect(initResult.capabilities).toBeDefined();
            
            // Get the legend from server capabilities
            expect(initResult.capabilities.semanticTokensProvider).toBeDefined();
            // Server might return SemanticTokensOptions or SemanticTokensRegistrationOptions which contain the legend
            // Or it might be just boolean true if static registration is used (less common)
            if (typeof initResult.capabilities.semanticTokensProvider === 'object' && initResult.capabilities.semanticTokensProvider !== null) {
                 semanticTokensLegend = initResult.capabilities.semanticTokensProvider.legend;
            }
            expect(semanticTokensLegend).toBeDefined();
            expect(semanticTokensLegend).not.toBeNull();
            if (!semanticTokensLegend) throw new Error('Semantic Tokens Legend not provided by server');
            console.log('Received Semantic Tokens Legend:', semanticTokensLegend);

            isLspInitialized = true;
            console.log('LSP Server Initialized for E2E semantic tokens test');

        } catch (error) {
            console.error('LSP Server initialization failed (semantic tokens test):', error);
            if (lspManager) {
                try { await lspManager.stopServer(true); } catch (e) { console.error('Failed to stop server post-init-error', e);}
            }
            throw error;
        }
    });

    afterAll(async () => {
        if (lspManager) {
            console.log('Shutting down LSP server after E2E semantic tokens tests...');
            try {
                await lspManager.stopServer();
                console.log('LSP server shutdown complete (semantic tokens test).');
            } catch (error) {
                console.error('Error during LSP shutdown (semantic tokens test):', error);
                try { await lspManager.stopServer(true); } catch (e) { console.error('Failed to force stop server post-shutdown-error', e);}
            }
        }
    });

    // Function to parse the semantic token data array
    function decodeSemanticTokens(data: number[], legend: SemanticTokensLegend): DecodedSemanticToken[] {
        const tokens: DecodedSemanticToken[] = [];
        let currentLine = 0;
        let currentChar = 0;

        for (let i = 0; i < data.length; i += 5) {
            const deltaLine = data[i];
            const deltaStartChar = data[i + 1];
            const length = data[i + 2];
            const tokenTypeIndex = data[i + 3];
            const tokenModifiersBitmask = data[i + 4];

            if (deltaLine > 0) {
                currentLine += deltaLine;
                currentChar = deltaStartChar; // New line, delta is absolute from start
            } else {
                currentChar += deltaStartChar; // Same line, delta is relative to previous token
            }

            const tokenType = legend.tokenTypes[tokenTypeIndex] ?? 'unknown_type';
            const tokenModifiers: string[] = [];
            for (let modIndex = 0; modIndex < legend.tokenModifiers.length; modIndex++) {
                if ((tokenModifiersBitmask & (1 << modIndex)) !== 0) {
                    tokenModifiers.push(legend.tokenModifiers[modIndex] ?? 'unknown_modifier');
                }
            }

            tokens.push({
                line: currentLine,
                startChar: currentChar,
                length: length,
                tokenType: tokenType,
                tokenModifiers: tokenModifiers,
            });
        }
        return tokens;
    }


    it('should discover @RestController and @GetMapping annotations via semantic tokens', async () => {
        if (!isLspInitialized || !semanticTokensLegend) {
            console.error('LSP not initialized or legend missing, skipping semantic tokens test.');
            throw new Error('LSP not initialized or legend missing, skipping semantic tokens test.');
        }

        const documentUri = URI.file(helloControllerPath).toString() as DocumentUri;
        const documentContent = fs.readFileSync(helloControllerPath, 'utf-8');
        // Log document content to verify
        console.log("--- Document Content Start ---");
        console.log(documentContent);
        console.log("--- Document Content End ---");

        const didOpenParams: DidOpenTextDocumentParams = {
            textDocument: {
                uri: documentUri,
                languageId: 'java',
                version: 1,
                text: documentContent,
            },
        };
        lspClient.textDocumentDidOpen(didOpenParams);
        
        await new Promise(resolve => setTimeout(resolve, 5000)); // Time for server to process

        const semanticTokensParams: SemanticTokensParams = {
            textDocument: { uri: documentUri }
        };
        
        let tokensResult: SemanticTokens | null = null;
        try {
            console.log(`Requesting semantic tokens for ${documentUri}`);
            tokensResult = await lspClient.getSemanticTokensFull(semanticTokensParams);
        } catch (e) {
            console.error('Error getting semantic tokens:', e);
            const logs = lspManager.getLogs ? lspManager.getLogs() : [];
            console.error('LSP Logs (semantic tokens error):', logs.join('\n'));
            throw e;
        }

        // console.log('Received raw tokens result:', JSON.stringify(tokensResult, null, 2));
        expect(tokensResult).toBeDefined();
        expect(tokensResult).not.toBeNull();
        if (!tokensResult) throw new Error('Semantic tokens result is null');
        expect(tokensResult.data).toBeDefined();
        expect(Array.isArray(tokensResult.data)).toBe(true);

        const decodedTokens = decodeSemanticTokens(tokensResult.data, semanticTokensLegend);
        // For debugging:
        // console.log('Decoded Tokens:', JSON.stringify(decodedTokens, null, 2)); // Log ALL decoded tokens

        // Find the tokens corresponding to the annotations
        // @RestController is on line 6 (0-indexed)
        // @GetMapping is on line 9 (0-indexed)
        // Simplify the check to focus only on position, length, and type
        const restControllerToken = decodedTokens.find(token => 
            token.line === 6 &&
            token.startChar === 1 && // Start char of RestController
            token.length === 14 && // Length of RestController
            token.tokenType === 'class'
        );

        const getMappingToken = decodedTokens.find(token => 
            token.line === 9 && 
            token.startChar === 5 && // Start char of GetMapping
            token.length === 10 && // Length of GetMapping
            token.tokenType === 'class'
        );

        // Log details for debugging if needed
        if (!restControllerToken) {
            console.log('RestController token not found. Tokens on line 6:', JSON.stringify(decodedTokens.filter(t => t.line === 6), null, 2));
        }
        if (!getMappingToken) {
            console.log('GetMapping token not found. Tokens on line 9:', JSON.stringify(decodedTokens.filter(t => t.line === 9), null, 2));
        }

        console.log('Found @RestController token:', restControllerToken ? 'Yes' : 'No');
        console.log('Found @GetMapping token:', getMappingToken ? 'Yes' : 'No');

        expect(restControllerToken).toBeDefined();
        expect(getMappingToken).toBeDefined();
    });
}); 