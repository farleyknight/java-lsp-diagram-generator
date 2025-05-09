import { ChildProcess, spawn } from 'child_process';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
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
    private pendingRequests: Map<number | string, { resolve: (value: any) => void, reject: (reason?: any) => void, method: string }> = new Map();
    private config: JavaLspConfig;
    private projectRootPath: string;
    private lspServerLog: string[] = [];
    private buffer: Buffer = Buffer.alloc(0);
    private instanceId: string;
    private discoveredServerJarPath: string | null = null;
    private killedByTimeout: boolean = false;

    constructor(config: JavaLspConfig, projectRootPath: string) {
        super();
        this.config = config;
        this.projectRootPath = projectRootPath;
        this.instanceId = Math.random().toString(36).substring(2, 7);
        console.log(`[LspManager CONSTRUCTOR] New instance created: ${this.instanceId}, requestCounter initialized to 0.`);
        this.requestCounter = 0;
    }

    private _findLauncherJar(): string {
        const pluginsDir = path.join(this.config.lspServerInstallDir, 'plugins');
        if (!fs.existsSync(pluginsDir) || !fs.statSync(pluginsDir).isDirectory()) {
            throw new Error(`Plugins directory not found or is not a directory: ${pluginsDir}`);
        }

        const files = fs.readdirSync(pluginsDir);
        const launcherJar = files.find(file => file.startsWith('org.eclipse.equinox.launcher_') && file.endsWith('.jar'));

        if (!launcherJar) {
            throw new Error(`Eclipse Equinox Launcher JAR not found in ${pluginsDir}. Looked for 'org.eclipse.equinox.launcher_*.jar'.`);
        }
        return path.join(pluginsDir, launcherJar);
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
            throw new Error("LSP server already running.");
        }

        if (!this.config.lspServerInstallDir) {
            throw new Error("LSP server installation directory (lspServerInstallDir) is not configured.");
        }
        
        try {
            this.discoveredServerJarPath = this._findLauncherJar();
            console.log(`Discovered LSP Server JAR: ${this.discoveredServerJarPath}`);
            this.lspServerLog.push(`Discovered LSP Server JAR: ${this.discoveredServerJarPath}`);
        } catch (error) {
            console.error("Failed to find LSP server JAR:", error);
            this.lspServerLog.push(`Failed to find LSP server JAR: ${error}`);
            throw error;
        }

        const configDir = path.join(this.config.lspServerInstallDir, this.getPlatformConfigDir());
        
        const workspaceDataPath = this.config.workspaceDataPath || path.join(this.projectRootPath, `.jdt_ws_data_${this.instanceId}`);
        if (!path.isAbsolute(workspaceDataPath)) {
            throw new Error(`workspaceDataPath must be an absolute path. Received: ${workspaceDataPath}`);
        }
        if (!fs.existsSync(path.dirname(workspaceDataPath))) {
            fs.mkdirSync(path.dirname(workspaceDataPath), { recursive: true });
        }

        const args = [
            ...this.config.serverArgs,
            `-Dlog.level=${this.config.logLevel || 'ALL'}`,
            '-jar', this.discoveredServerJarPath,
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
        this.killedByTimeout = false;

        if (force) {
            this.childProcess.kill('SIGKILL');
            this.childProcess = null;
            this.pendingRequests.forEach(req => req.reject(new Error('LSP Server forced to stop.')));
            this.pendingRequests.clear();
            this.lspServerLog.push('LSP Server stopped forcefully (force=true).');
            console.log("LSP Server stopped forcefully (force=true).");
            return Promise.resolve();
        }

        return new Promise(async (resolve, reject) => {
            const onExitHandlerForPromise = (code: number | null, signal: NodeJS.Signals | null) => {
                clearTimeout(timeoutId);
                this.lspServerLog.push(`LSP Server exited (event for stopServer promise). Code: ${code}, Signal: ${signal}`);
                resolve();
            };
            this.once('exit', onExitHandlerForPromise);

            const timeoutId = setTimeout(() => {
                this.removeListener('exit', onExitHandlerForPromise);
                
                console.warn('LSP Server shutdown timed out. Forcing kill.');
                this.lspServerLog.push('LSP Server shutdown timed out. Forcing kill.');
                this.killedByTimeout = true;

                const actualExitConfirmationPromise = new Promise<void>((resolveActualExit, rejectActualExit) => {
                    const secondaryTimeout = setTimeout(() => {
                        this.lspServerLog.push('Secondary timeout waiting for exit confirmation after SIGKILL.');
                        rejectActualExit(new Error('Secondary timeout waiting for exit confirmation after SIGKILL'));
                    }, 200);

                    this.once('exit', (code, signal) => {
                        clearTimeout(secondaryTimeout);
                        this.lspServerLog.push(`Received LspManager 'exit' event (code: ${code}, signal: ${signal}) after timeout SIGKILL for stopServer.`);
                        resolveActualExit();
                    });
                });
                
                if (this.childProcess) {
                    this.childProcess.kill('SIGKILL');
                } else {
                    this.lspServerLog.push('Child process was null when timeout kill attempted.');
                }
                
                this.pendingRequests.forEach(req => req.reject(new Error(`LSP Server shutdown timed out. Request ${req.method} aborted.`)));
                this.pendingRequests.clear();

                actualExitConfirmationPromise
                    .catch(e => this.lspServerLog.push(`actualExitConfirmationPromise error: ${e.message || e}`))
                    .finally(() => {
                        reject(new Error('Shutdown timeout'));
                    });

            }, 5000);

            try {
                await this.sendRequest('shutdown', null);
                this.sendNotification('exit', null);
                const message = 'Sent shutdown request and exit notification. Waiting for LspManager \'exit\' event.';
                this.lspServerLog.push(message);
                // Now we wait for the 'exit' event (onExitHandlerForPromise) or the timeout.
            } catch (error) {
                this.removeListener('exit', onExitHandlerForPromise);
                clearTimeout(timeoutId);
                console.error('Error during graceful shutdown sequence (request failed):', error);
                this.lspServerLog.push(`Error during graceful shutdown (request failed): ${error}`);
                
                this.killedByTimeout = true;
                if (this.childProcess) {
                    this.childProcess.kill('SIGKILL');
                }
                
                this.pendingRequests.forEach(req => req.reject(new Error(`LSP Server shutdown failed (request error). Request ${req.method} aborted.`)));
                this.pendingRequests.clear();
                
                const errorKillExitConfirmPromise = new Promise<void>((resolveErrKill, rejectErrKill) => {
                    const secondaryTimeout = setTimeout(() => rejectErrKill(new Error('Sec. timeout on error kill confirm')), 200);
                    this.once('exit', (code, signal) => {
                        clearTimeout(secondaryTimeout);
                        this.lspServerLog.push(`Received LspManager 'exit' event (code: ${code}, signal: ${signal}) during error kill confirmation.`);
                        resolveErrKill();
                    });
                });

                errorKillExitConfirmPromise
                    .catch(e => this.lspServerLog.push(`errorKillExitConfirmPromise error: ${e.message || e}`))
                    .finally(() => {
                        reject(error);
                    });
            }
        });
    }

    public sendRequest<TParams, TResult>(method: string, params: TParams): Promise<TResult> {
        if (!this.childProcess || !this.childProcess.stdin) {
            console.error(`[LspManager.sendRequest INSTANCE: ${this.instanceId}] Server not running or stdin not available`);
            return Promise.reject(new Error('LSP server is not running or stdin is not available.'));
        }
        console.log(`[LspManager.sendRequest INSTANCE: ${this.instanceId}] Method: ${method}, Current requestCounter for this instance: ${this.requestCounter}, ID to be used: ${this.requestCounter}`);
        const id = this.requestCounter++;
        const message = formatRequestMessage(id, method, params);
        
        console.log(`[LspManager.sendRequest INSTANCE: ${this.instanceId}] Method: ${method}, ID: ${id}. Pending requests BEFORE add: ${JSON.stringify(Array.from(this.pendingRequests.keys()))}`);

        return new Promise<TResult>((resolve, reject) => {
            this.pendingRequests.set(id, { resolve, reject, method });
            console.log(`[LspManager.sendRequest INSTANCE: ${this.instanceId}] Method: ${method}, ID: ${id}. Pending requests AFTER add: ${JSON.stringify(Array.from(this.pendingRequests.keys()))}`);
            try {
                this.childProcess!.stdin!.write(message, 'utf-8');
            } catch (err) {
                console.error(`[LspManager.sendRequest INSTANCE: ${this.instanceId}] Error writing to stdin for method ${method}, ID: ${id}:`, err);
                this.pendingRequests.delete(id); 
                reject(err);
            }
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
        console.log(`[LspManager.handleData INSTANCE: ${this.instanceId}] ENTER. Initial this.buffer length: ${this.buffer.length}, Incoming data length: ${data.length}`);
        this.buffer = Buffer.concat([this.buffer, data]);
        console.log(`[LspManager.handleData INSTANCE: ${this.instanceId}] After concat, this.buffer length: ${this.buffer.length}. Current requestCounter: ${this.requestCounter}.`);

        while (true) {
            console.log(`[LspManager.handleData INSTANCE: ${this.instanceId}] Top of while loop. Buffer length: ${this.buffer.length}`);
            const parsed = parseMessage(this.buffer);
            console.log(`[LspManager.handleData INSTANCE: ${this.instanceId}] parseMessage called. Returned message: ${parsed.message ? 'exists' : 'null'}`);
            if (!parsed.message) {
                console.log(`[LspManager.handleData INSTANCE: ${this.instanceId}] No message from parseMessage, breaking while loop.`);
                break; 
            }
            this.buffer = parsed.remainingBuffer;
            console.log(`[LspManager.handleData INSTANCE: ${this.instanceId}] After processing message, remainingBuffer length: ${this.buffer.length}`);

            const message = parsed.message as any; 
            // COMMENTING OUT VERBOSE LOG
            // this.lspServerLog.push(`RECV ${message.method || 'response'} (ID: ${message.id ?? 'N/A'}): ${JSON.stringify(message.params || message.result || message.error || {})}`);

            if (message.id !== undefined) { 
                const response = message as JsonRpcResponse;
                
                if (response.id === null) {
                    console.warn(`[LspManager.handleData INSTANCE: ${this.instanceId}] Received response with null ID:`, response);
                    // this.lspServerLog.push(`WARN: Received response with null ID: ${JSON.stringify(response)}`);
                } else {
                    console.log(`[LspManager.handleData INSTANCE: ${this.instanceId}] Processing response for ID: ${response.id}. Current pending request IDs: ${JSON.stringify(Array.from(this.pendingRequests.keys()))}`);
                    const pending = this.pendingRequests.get(response.id);
                    if (pending) {
                        if (response.error) {
                            pending.reject(response.error);
                        } else {
                            pending.resolve(response.result);
                        }
                        this.pendingRequests.delete(response.id);
                    } else {
                        console.warn(`[LspManager.handleData INSTANCE: ${this.instanceId}] Received response for unknown request ID: ${response.id}`); 
                        // this.lspServerLog.push(`WARN: Received response for unknown request ID: ${response.id}`);
                    }
                }
            } else { 
                const notification = message as JsonRpcNotification;
                this.emit(notification.method, notification.params);
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
        
        const KILLED_BY_TIMEOUT_OR_FORCE = this.killedByTimeout;
        
        this.childProcess = null;
        this.killedByTimeout = false;

        if (!KILLED_BY_TIMEOUT_OR_FORCE) {
            if (this.pendingRequests.size > 0) {
                this.lspServerLog.push(`Server exited unexpectedly or gracefully with ${this.pendingRequests.size} pending requests. Rejecting them.`);
                this.pendingRequests.forEach(req => req.reject(new Error(`LSP Server exited with code ${code}, signal ${signal}. Request ${req.method} aborted.`)));
                this.pendingRequests.clear();
            }
        }

        this.emit('exit', code, signal);
    }

    public getLogs(): string[] {
        return this.lspServerLog;
    }
} 