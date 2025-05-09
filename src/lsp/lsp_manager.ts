import { ChildProcess, spawn } from 'child_process';
import * as os from 'os';
import * as path from 'path';
import { EventEmitter } from 'events';
import { JavaLspConfig } from '../config/lsp_config';
import { 
    JsonRpcResponse, JsonRpcNotification, 
    InitializeParams, InitializeResult, InitializedParams, 
    SemanticTokenTypes, SemanticTokenModifiers
} from './types';
import { formatRequestMessage, formatNotificationMessage, parseMessage } from './json_rpc_protocol';

export class LspManager extends EventEmitter {
    private childProcess: ChildProcess | null = null;
    private requestCounter: number = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private pendingRequests: Map<number | string, { resolve: (value: any) => void, reject: (reason?: any) => void, method: string }> = new Map();
    private config: JavaLspConfig;
    private projectRootPath: string;
    private lspServerLog: string[] = [];
    private buffer: Buffer = Buffer.alloc(0);

    constructor(config: JavaLspConfig, projectRootPath: string) {
        super();
        this.config = config;
        this.projectRootPath = projectRootPath;
    }

    private getPlatformConfigDir(): string {
        switch (os.platform()) {
            case 'win32': return 'config_win';
            case 'darwin': return 'config_mac';
            case 'linux': return 'config_linux';
            default: throw new Error(`Unsupported platform: ${os.platform()}`);
        }
    }

    public async startServer(): Promise<InitializeResult> {
        if (this.childProcess) {
            console.warn("LSP Server is already running.");
            // Optionally, resolve with current status or re-initialize
            // For now, let's assume we want a fresh start or this is an error condition
            throw new Error("LSP server already running.")
        }

        const serverJarPath = this.config.serverJarPath;
        if (!serverJarPath) {
            throw new Error("LSP server JAR path (serverJarPath) is not configured.");
        }

        const lspServerDir = path.dirname(serverJarPath);
        const configDir = path.join(lspServerDir, '..' , this.getPlatformConfigDir()); // Assuming jar is in plugins/ dir
        
        // Ensure workspaceDataPath is absolute, defaulting to a .jdt_ws_data in the project root
        const workspaceDataPath = this.config.workspaceDataPath || path.join(this.projectRootPath, '.jdt_ws_data');
        if (!path.isAbsolute(workspaceDataPath)) {
            throw new Error(`workspaceDataPath must be an absolute path. Received: ${workspaceDataPath}`);
        }

        const args = [
            ...this.config.serverArgs,
            `-Dlog.level=${this.config.logLevel || 'ALL'}`,
            '-jar', serverJarPath,
            '-configuration', configDir,
            '-data', workspaceDataPath
        ];

        console.log(`Starting LSP server with command: ${this.config.serverCommand} ${args.join(' ')}`);
        this.lspServerLog.push(`Starting LSP server with command: ${this.config.serverCommand} ${args.join(' ')}`);

        this.childProcess = spawn(this.config.serverCommand, args, {
            stdio: ['pipe', 'pipe', 'pipe'], // stdin, stdout, stderr
            cwd: this.projectRootPath // Set working directory for the LSP server
        });

        this.childProcess.stdout!.on('data', (data: Buffer) => this.handleData(data));
        this.childProcess.stderr!.on('data', (data: Buffer) => this.handleErrorData(data));
        this.childProcess.on('error', (error: Error) => this.handleError(error));
        this.childProcess.on('exit', (code: number | null, signal: NodeJS.Signals | null) => this.handleExit(code, signal));

        // Send initialize request
        const initializeParams: InitializeParams = {
            processId: process.pid,
            clientInfo: {
                name: 'JavaLSPDiagramGenerator',
                version: '0.1.0' // TODO: Get from package.json
            },
            rootUri: `file://${this.projectRootPath}`,
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
                    references: { dynamicRegistration: true },
                    documentSymbol: {
                        dynamicRegistration: true,
                        hierarchicalDocumentSymbolSupport: true,
                        // symbolKind: { // Temporarily removed for testing
                        //     valueSet: [
                        //         SymbolKind.File,
                        //         SymbolKind.Module,
                        //         SymbolKind.Namespace,
                        //         SymbolKind.Package,
                        //         SymbolKind.Class,
                        //         SymbolKind.Method,
                        //         SymbolKind.Property,
                        //         SymbolKind.Field,
                        //         SymbolKind.Constructor,
                        //         SymbolKind.Enum,
                        //         SymbolKind.Interface,
                        //         SymbolKind.Function,
                        //         SymbolKind.Variable,
                        //         SymbolKind.Constant,
                        //         SymbolKind.String,
                        //         SymbolKind.Number,
                        //         SymbolKind.Boolean,
                        //         SymbolKind.Array,
                        //         SymbolKind.Object,
                        //         SymbolKind.Key,
                        //         SymbolKind.Null,
                        //         SymbolKind.EnumMember,
                        //         SymbolKind.Struct,
                        //         SymbolKind.Event,
                        //         SymbolKind.Operator,
                        //         SymbolKind.TypeParameter
                        //     ]
                        // },
                    },  
                    hover: {
                        dynamicRegistration: true,
                        // contentFormat: [ // Temporarily removed for testing
                        //     MarkupKind.Markdown,
                        //     MarkupKind.PlainText
                        // ]
                    },
                    semanticTokens: {
                        dynamicRegistration: true,
                        requests: {
                            full: true
                        },
                        tokenTypes: Object.values(SemanticTokenTypes),
                        tokenModifiers: Object.values(SemanticTokenModifiers),
                        formats: ['relative'],
                        overlappingTokenSupport: false,
                        multilineTokenSupport: false
                    }
                },
                workspace: {
                    workspaceFolders: true,
                    configuration: true
                }
            },
            trace: 'verbose', // 'off', 'messages', 'verbose'
            workspaceFolders: [{
                uri: `file://${this.projectRootPath}`,
                name: path.basename(this.projectRootPath)
            }]
        };

        try {
            const initResult = await this.sendRequest<InitializeParams, InitializeResult>('initialize', initializeParams);
            console.log('LSP Server initialized:', initResult.capabilities.callHierarchyProvider ? 'CallHierarchy Supported' : 'CallHierarchy NOT Supported');
            this.lspServerLog.push('LSP Server initialized.');
            
            const initializedParams: InitializedParams = {};
            this.sendNotification<InitializedParams>('initialized', initializedParams);
            this.lspServerLog.push('Sent initialized notification.');
            this.emit('initialized', initResult);
            return initResult;
        } catch (error) {
            console.error('LSP Initialization failed:', error);
            this.lspServerLog.push(`LSP Initialization failed: ${error}`);
            this.stopServer(true); // Force stop if initialization fails
            throw error;
        }
    }

    public async stopServer(force: boolean = false): Promise<void> {
        if (!this.childProcess) {
            console.warn("LSP Server is not running.");
            return;
        }
        this.lspServerLog.push('Stopping LSP server...');
        console.log("Stopping LSP server...");

        if (force) {
            this.childProcess.kill('SIGTERM');
            this.childProcess = null;
            this.pendingRequests.forEach(req => req.reject(new Error('LSP Server forced to stop.')));
            this.pendingRequests.clear();
            this.lspServerLog.push('LSP Server stopped forcefully.');
            console.log("LSP Server stopped forcefully.");
            this.emit('exit', -1, 'SIGTERM');
            return;
        }

        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            const timeout = setTimeout(() => {
                console.warn('LSP Server shutdown timed out. Forcing kill.');
                this.lspServerLog.push('LSP Server shutdown timed out. Forcing kill.');
                this.childProcess?.kill('SIGKILL');
                reject(new Error('Shutdown timeout'));
            }, 5000); // 5 seconds timeout for graceful shutdown

            try {
                await this.sendRequest('shutdown', null);
                this.sendNotification('exit', null);
                this.lspServerLog.push('Sent shutdown request and exit notification.');
                // The 'exit' event handler on childProcess will resolve this or timeout will reject
            } catch (error) {
                console.error('Error during graceful shutdown sequence:', error);
                this.lspServerLog.push(`Error during graceful shutdown: ${error}`);
                this.childProcess?.kill('SIGKILL'); // Force kill if shutdown request fails
                reject(error);
            } finally {
                // Listener for the actual exit will handle cleanup and resolve
                this.once('exit', () => {
                    clearTimeout(timeout);
                    resolve();
                });
            }
        });
    }

    public sendRequest<TParams, TResult>(method: string, params: TParams): Promise<TResult> {
        if (!this.childProcess || !this.childProcess.stdin) {
            return Promise.reject(new Error('LSP server is not running or stdin is not available.'));
        }
        const id = this.requestCounter++;
        const message = formatRequestMessage(id, method, params);
        
        this.lspServerLog.push(`SEND Request (${id}) ${method}: ${JSON.stringify(params)}`);
        // console.debug(`LSP SEND REQ (${id}) ${method}:`, params);

        this.childProcess.stdin.write(message);

        return new Promise((resolve, reject) => {
            this.pendingRequests.set(id, { resolve, reject, method });
            // Optional: Add a timeout for requests
            // setTimeout(() => {
            //     if (this.pendingRequests.has(id)) {
            //         this.pendingRequests.delete(id);
            //         reject(new Error(`Request ${method} (${id}) timed out`));
            //     }
            // }, 30000); // 30s timeout
        });
    }

    public sendNotification<TParams>(method: string, params: TParams): void {
        if (!this.childProcess || !this.childProcess.stdin) {
            console.warn('LSP server is not running or stdin is not available. Notification not sent.');
            return;
        }
        const message = formatNotificationMessage(method, params);
        this.lspServerLog.push(`SEND Notification ${method}: ${JSON.stringify(params)}`);
        // console.debug(`LSP SEND NOTIF ${method}:`, params);
        this.childProcess.stdin.write(message);
    }

    private handleData(data: Buffer): void {
        this.buffer = Buffer.concat([this.buffer, data]);
        // console.debug("LSP RECV RAW: ", data.toString('utf-8'));
        this.lspServerLog.push(`RECV RAW: ${data.toString('utf-8')}`);

        // eslint-disable-next-line no-constant-condition
        while (true) {
            const result = parseMessage(this.buffer);
            if (!result.message) {
                // Need more data or buffer is malformed (though parseMessage handles some malformations)
                this.buffer = result.remainingBuffer; // Store potentially incomplete part
                break;
            }

            this.buffer = result.remainingBuffer;
            const message = result.message as JsonRpcResponse | JsonRpcNotification;
            // console.debug("LSP RECV MSG: ", message);
            this.lspServerLog.push(`RECV MSG: ${JSON.stringify(message)}`);

            if ('id' in message && message.id !== null && message.id !== undefined) { // It's a Response
                const response = message as JsonRpcResponse;
                // Ensure response.id is not null before using it as a key
                if (response.id === null) {
                    console.warn('Received response with null ID:', response);
                    this.lspServerLog.push(`WARN: Received response with null ID: ${JSON.stringify(response)}`);
                    // Potentially emit an error or handle as a special case
                    // For now, we just log and ignore it as we can't map it to a request.
                    return; // or continue to next message in buffer
                }
                const pending = this.pendingRequests.get(response.id);
                if (pending) {
                    if (response.error) {
                        console.error(`LSP Error for ${pending.method} (${response.id}):`, response.error);
                        this.lspServerLog.push(`ERR for ${pending.method} (${response.id}): ${JSON.stringify(response.error)}`);
                        pending.reject(response.error);
                    } else {
                        this.lspServerLog.push(`OK for ${pending.method} (${response.id})`);
                        pending.resolve(response.result);
                    }
                    this.pendingRequests.delete(response.id);
                } else {
                    console.warn(`Received response for unknown request ID: ${response.id}`);
                    this.lspServerLog.push(`WARN: Received response for unknown request ID: ${response.id}`);
                }
            } else { // It's a Notification
                const notification = message as JsonRpcNotification;
                // console.debug(`LSP RECV NOTIF ${notification.method}:`, notification.params);
                this.lspServerLog.push(`RECV Notification ${notification.method}: ${JSON.stringify(notification.params)}`);
                this.emit(notification.method, notification.params);
                this.emit('notification', notification); // Generic notification event
            }
        }
    }

    private handleErrorData(data: Buffer): void {
        const errorMsg = data.toString('utf-8');
        console.error('LSP Server STDERR:', errorMsg);
        this.lspServerLog.push(`STDERR: ${errorMsg}`);
        this.emit('stderr', errorMsg);
    }

    private handleError(error: Error): void {
        console.error('LSP Server Error:', error);
        this.lspServerLog.push(`ERROR: ${error.message}`);
        this.emit('error', error);
        // Consider stopping the server or attempting a restart
        this.stopServer(true); // Force stop on critical process error
    }

    private handleExit(code: number | null, signal: NodeJS.Signals | null): void {
        console.log(`LSP Server Exited. Code: ${code}, Signal: ${signal}`);
        this.lspServerLog.push(`EXIT. Code: ${code}, Signal: ${signal}`);
        this.childProcess = null;
        // Reject any outstanding requests
        this.pendingRequests.forEach(req => req.reject(new Error(`LSP Server exited with code ${code}, signal ${signal}. Request ${req.method} aborted.`)));
        this.pendingRequests.clear();
        this.emit('exit', code, signal);
    }

    public getLogs(): string[] {
        return this.lspServerLog;
    }
} 