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
    private isStopped: boolean = false;

    constructor(config: JavaLspConfig, projectRootPath: string) {
        super();
        this.config = config;
        this.projectRootPath = projectRootPath;
        this.instanceId = Math.random().toString(36).substring(2, 7);
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
            throw new Error("LSP server already running.");
        }

        if (!this.config.lspServerInstallDir) {
            throw new Error("LSP server installation directory (lspServerInstallDir) is not configured.");
        }
        
        try {
            this.discoveredServerJarPath = this._findLauncherJar();
            this.lspServerLog.push(`Discovered LSP Server JAR: ${this.discoveredServerJarPath}`);
        } catch (error) {
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
            this.lspServerLog.push('LSP Server initialized.');
            
            const initializedParams: InitializedParams = {};
            this.sendNotification<InitializedParams>('initialized', initializedParams);
            this.lspServerLog.push('Sent initialized notification.');
            this.emit('initialized', initResult);
            return initResult;
        } catch (error) {
            this.lspServerLog.push(`LSP Initialization failed: ${error}`);
            this.stopServer(true); // Force stop if initialization fails
            throw error;
        }
    }

    public async stopServer(force: boolean = false): Promise<void> {
        if (!this.childProcess) {
            return;
        }
        this.isStopped = true;
        this.lspServerLog.push('Stopping LSP server...');
        this.killedByTimeout = false;

        if (force) {
            return new Promise<void>((resolve, reject) => {
                const forceKillTimeoutMs = 5000; // 5 seconds for forced kill confirmation
                let timeoutId: NodeJS.Timeout | null = null;

                const exitHandler = (code: number | null, signal: NodeJS.Signals | null) => {
                    if (timeoutId) {
                        clearTimeout(timeoutId);
                        timeoutId = null;
                    }
                    this.lspServerLog.push(`LSP Server force-stopped. Confirmed exit (code: ${code}, signal: ${signal}).`);
                    resolve();
                };

                this.once('exit', exitHandler);

                if (this.childProcess) {
                    this.lspServerLog.push('LSP Server stop: Issuing SIGKILL for force stop.');
                    
                    // Reject pending requests explicitly for the force stop scenario
                    this.pendingRequests.forEach(req => req.reject(new Error('LSP Server forced to stop.')));
                    this.pendingRequests.clear();
                    
                    this.childProcess.kill('SIGKILL');
                    // Note: this.childProcess will be set to null in handleExit
                } else {
                    this.lspServerLog.push('LSP Server force-stop: childProcess was already null.');
                    this.removeListener('exit', exitHandler); // Clean up listener if no process
                    resolve(); // Resolve immediately if no process to kill
                    return;
                }

                this.lspServerLog.push('LSP Server stop signalled forcefully (force=true). Waiting for exit confirmation.');

                timeoutId = setTimeout(() => {
                    this.removeListener('exit', exitHandler); // Clean up listener on timeout
                    const msg = `LSP Server force-stop: Timeout (${forceKillTimeoutMs}ms) waiting for exit confirmation after SIGKILL.`;
                    this.lspServerLog.push(msg);
                    reject(new Error(msg));
                }, forceKillTimeoutMs);
            });
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

            }, 30000);

            try {
                await this.sendRequest('shutdown', null);
                this.sendNotification('exit', null);
                const message = 'Sent shutdown request and exit notification. Waiting for LspManager \'exit\' event.';
                this.lspServerLog.push(message);
                // Now we wait for the 'exit' event (onExitHandlerForPromise) or the timeout.
            } catch (error) {
                this.removeListener('exit', onExitHandlerForPromise);
                clearTimeout(timeoutId);
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

    private writeToStdin(message: string, encoding?: BufferEncoding) {
        if (this.childProcess && this.childProcess.stdin && this.childProcess.stdin.writable) {
            // --- BEGIN ADDED DEBUG LOGGING ---
            // Dynamically require 'util' only if needed and in a Node.js environment.
            let loggedMessage = message;
            if (typeof process !== 'undefined' && process.versions && process.versions.node) { // Check if in Node.js
                const inspect = require('util').inspect;
                if (typeof message !== 'string') { 
                    loggedMessage = inspect(message, { depth: null, maxStringLength: 500 });
                } else {
                    loggedMessage = message.replace(/\r/g, '\\r').replace(/\n/g, '\\n').replace(/\t/g, '\\t');
                    if (loggedMessage.length > 400) {
                         loggedMessage = loggedMessage.substring(0, 397) + "...";
                    }
                }
            } else { // Fallback for non-Node.js or if 'util' is not available
                loggedMessage = message.substring(0, Math.min(message.length, 400)) + (message.length > 400 ? "..." : "");
            }
            console.log(`LspManager: Writing to JDT LS stdin: >>>${loggedMessage}<<<`);
            // --- END ADDED DEBUG LOGGING ---
            
            if (encoding) {
                this.childProcess.stdin.write(message, encoding);
            } else {
                this.childProcess.stdin.write(message);
            }
            // Use existing logging mechanism if available, otherwise console.log
            const logEntry = `Sent ${message.substring(0, message.indexOf('{')) || 'notification/response (no body preview)'}`;
            if (typeof (this as any).log === 'function') { // Check if a 'log' method exists
                 (this as any).log(logEntry);
            } else if (this.lspServerLog && typeof this.lspServerLog.push === 'function') {
                this.lspServerLog.push(logEntry);
            } else {
                console.log(logEntry); // Fallback logging
            }
        } else {
            const warnMsg = 'Attempted to write to stdin, but childProcess or stdin is not available/writable.';
            if (typeof (this as any).logWarn === 'function') { // Check for logWarn
                (this as any).logWarn(warnMsg);
            } else if (this.lspServerLog && typeof this.lspServerLog.push === 'function') {
                this.lspServerLog.push(`WARN: ${warnMsg}`);
            } else {
                console.warn(warnMsg); // Fallback warning
            }
        }
    }

    public sendRequest<TParams, TResult>(method: string, params: TParams): Promise<TResult> {
        return new Promise<TResult>((resolve, reject) => {
            if (!this.childProcess || !this.childProcess.stdin || !this.childProcess.stdin.writable) {
                const errorMsg = 'LSP server is not running or stdin is not available/writable.';
                 if (typeof (this as any).logError === 'function') { (this as any).logError(errorMsg); } else { console.error(errorMsg); }
                return reject(new Error(errorMsg));
            }
            const id = this.requestCounter++;
            const message = formatRequestMessage(id, method, params);
            
            this.pendingRequests.set(id, { resolve, reject, method });
            
            // Log a summary of the request before detailed stdin write
            const requestSummary = `SEND Request ${method} (ID ${id}): ${JSON.stringify(params).substring(0,100)}`;
            if (typeof (this as any).log === 'function') { (this as any).log(requestSummary); } 
            else if (this.lspServerLog && typeof this.lspServerLog.push === 'function') { this.lspServerLog.push(requestSummary); } 
            else { console.log(requestSummary); }
            
            this.writeToStdin(message, 'utf-8');

            // Timeout for requests
            const timeoutId = setTimeout(() => {
                const pendingReq = this.pendingRequests.get(id);
                if (pendingReq) {
                    const errorMsg = `Request ${method} (ID: ${id}) timed out.`;
                    if (typeof (this as any).logError === 'function') { (this as any).logError(errorMsg); } else { console.error(errorMsg); }
                    pendingReq.reject(new Error(errorMsg));
                    this.pendingRequests.delete(id);
                }
            }, 30000); // 30 second timeout

            // Store timeoutId on the pending request object to clear it later
            const pendingReq = this.pendingRequests.get(id);
            if(pendingReq) {
                (pendingReq as any).timeoutId = timeoutId; 
            }
        });
    }

    public sendNotification<TParams>(method: string, params: TParams): void {
        if (!this.childProcess || !this.childProcess.stdin || !this.childProcess.stdin.writable) {
            const warnMsg = 'LSP server is not running or stdin is not available/writable. Cannot send notification.';
            if (typeof (this as any).logWarn === 'function') { (this as any).logWarn(warnMsg); } else { console.warn(warnMsg); }
            return;
        }
        const message = formatNotificationMessage(method, params);
        // Log a summary of the notification before detailed stdin write
        const notificationSummary = `SEND Notification ${method}: ${JSON.stringify(params).substring(0,100)}`;
        if (typeof (this as any).log === 'function') { (this as any).log(notificationSummary); } 
        else if (this.lspServerLog && typeof this.lspServerLog.push === 'function') { this.lspServerLog.push(notificationSummary); } 
        else { console.log(notificationSummary); }

        this.writeToStdin(message); 
    }

    private handleData(data: Buffer): void {
        this.buffer = Buffer.concat([this.buffer, data]);

        while (true) {
            const parsed = parseMessage(this.buffer);
            if (!parsed.message) {
                break; 
            }
            this.buffer = parsed.remainingBuffer;

            const message = parsed.message as any; 

            if (message.id !== undefined) { 
                const response = message as JsonRpcResponse;
                
                if (response.id === null) {
                } else {
                    const pending = this.pendingRequests.get(response.id);
                    if (pending) {
                        if (response.error) {
                            pending.reject(response.error);
                        } else {
                            pending.resolve(response.result);
                        }
                        this.pendingRequests.delete(response.id);
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
        this.lspServerLog.push(`STDERR: ${errorMsg}`);
        this.emit('stderr', errorMsg);
    }

    private handleError(error: Error): void {
        this.lspServerLog.push(`ERROR: ${error.message}`);
        this.emit('error', error);
        this.stopServer(true); // Force stop on critical process error
    }

    private handleExit(code: number | null, signal: NodeJS.Signals | null): void {
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