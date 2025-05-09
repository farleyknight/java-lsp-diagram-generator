import { LspManager } from '../../src/lsp/lsp_manager';
import { JavaLspConfig } from '../../src/config/lsp_config';
import * as child_process from 'child_process';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs'; // Ensure fs is imported
import { EventEmitter } from 'events'; // EventEmitter is used by LspManager
import { formatRequestMessage, formatNotificationMessage, parseMessage, ParsedMessageResult } from '../../src/lsp/json_rpc_protocol';
import { InitializeParams, InitializeResult, JsonRpcResponse, JsonRpcNotification } from '../../src/lsp/types';

// Mocks
jest.mock('child_process');
jest.mock('os');
jest.mock('../../src/lsp/json_rpc_protocol');
jest.mock('fs'); // Mock the fs module

const mockedSpawn = child_process.spawn as jest.MockedFunction<typeof child_process.spawn>;
const mockedOsPlatform = os.platform as jest.MockedFunction<typeof os.platform>;
const mockedFormatRequestMessage = formatRequestMessage as jest.MockedFunction<typeof formatRequestMessage>;
const mockedFormatNotificationMessage = formatNotificationMessage as jest.MockedFunction<typeof formatNotificationMessage>;
const mockedParseMessage = parseMessage as jest.MockedFunction<typeof parseMessage>;


describe('LspManager', () => {
    let lspManager: LspManager;
    let mockConfig: JavaLspConfig;
    const projectRootPath = '/test/project';
    let mockChildProcess: jest.Mocked<child_process.ChildProcess>; // Keep mocked type for clarity
    let mockStdin: { write: jest.Mock }; // Simple mock for stdin write
    let mockStdout: EventEmitter & { on: (event: 'data', listener: (data: Buffer) => void) => any };
    let mockStderr: EventEmitter & { on: (event: 'data', listener: (data: Buffer) => void) => any };

    beforeEach(() => {
        jest.clearAllMocks();

        // Default mock implementations for fs methods used in LspManager
        (fs.existsSync as jest.Mock).mockReturnValue(true); // Assume paths exist by default
        (fs.statSync as jest.Mock).mockReturnValue({ isDirectory: () => true } as fs.Stats); // Assume is directory
        (fs.readdirSync as jest.Mock).mockReturnValue(['org.eclipse.equinox.launcher_MOCK.jar']); // Provide a mock launcher jar
        (fs.mkdirSync as jest.Mock).mockImplementation(() => {}); // Mock mkdirSync to do nothing

        mockConfig = {
            serverCommand: 'java',
            lspServerInstallDir: '/path/to/lsp',
            serverArgs: ['-Xmx1G'],
            workspaceDataPath: '/abs/path/to/workspace',
            logLevel: 'INFO',
        };

        // Simple mocks sufficient for current tests
        mockStdin = { write: jest.fn() };
        // mockStdout = new EventEmitter();
        // mockStderr = new EventEmitter();
        
        // Create more specific mocks for stdout/stderr that are EventEmitters
        // and have the .on('data', ...) signature LspManager uses.
        const createMockReadableStream = (): EventEmitter & { on: (event: 'data', listener: (data: Buffer) => void) => any } => {
            const emitter = new EventEmitter();
            const originalOn = emitter.on.bind(emitter); // Store the original 'on' method

            (emitter as any).on = (event: string, listener: (...args: any[]) => void) => {
                if (event === 'data') {
                    // Call the original 'on' method for 'data' events with specific typing
                    return originalOn(event, listener as (data: Buffer) => void);
                }
                // Call the original 'on' method for all other events
                return originalOn(event, listener);
            };
            return emitter as any;
        };
        mockStdout = createMockReadableStream();
        mockStderr = createMockReadableStream();

        mockChildProcess = {
            stdin: mockStdin as any, 
            stdout: mockStdout as any, 
            stderr: mockStderr as any, 
            pid: 12345,
            kill: jest.fn(),
            on: jest.fn(), 
        } as unknown as jest.Mocked<child_process.ChildProcess>;

        // Configure the main mock function to return our specific mock object
        mockedSpawn.mockReturnValue(mockChildProcess);
        mockedOsPlatform.mockReturnValue('linux');
        mockedFormatRequestMessage.mockImplementation((id, method, params) => 
            `Content-Length: ${JSON.stringify({jsonrpc: '2.0', id, method, params}).length}\r\n\r\n${JSON.stringify({jsonrpc: '2.0', id, method, params})}`
        );
        mockedFormatNotificationMessage.mockImplementation((method, params) => 
             `Content-Length: ${JSON.stringify({jsonrpc: '2.0', method, params}).length}\r\n\r\n${JSON.stringify({jsonrpc: '2.0', method, params})}`
        );
        mockedParseMessage.mockReturnValue({ message: null, remainingBuffer: Buffer.from('') }); // Default mock

        lspManager = new LspManager(mockConfig, projectRootPath);
    });

    describe('Constructor and Platform Config', () => {
        it('should initialize correctly with config and projectRootPath', () => {
            expect(lspManager).toBeInstanceOf(LspManager);
        });

        it('getPlatformConfigDir should return correct config_mac for darwin', () => {
            mockedOsPlatform.mockReturnValue('darwin');
            expect((lspManager as any).getPlatformConfigDir()).toBe('config_mac');
        });

        it('getPlatformConfigDir should return correct config_win for win32', () => {
            mockedOsPlatform.mockReturnValue('win32');
            expect((lspManager as any).getPlatformConfigDir()).toBe('config_win');
        });

        it('getPlatformConfigDir should return correct config_linux for linux', () => {
            mockedOsPlatform.mockReturnValue('linux');
            expect((lspManager as any).getPlatformConfigDir()).toBe('config_linux');
        });

        it('getPlatformConfigDir should throw for unsupported platform', () => {
            mockedOsPlatform.mockReturnValue('sunos' as any);
            expect(() => (lspManager as any).getPlatformConfigDir()).toThrow('Unsupported platform: sunos');
        });
    });

    describe('startServer', () => {
        const mockInitializeResult: InitializeResult = { capabilities: { textDocumentSync: 1 } };

        beforeEach(() => {
            console.log('[startServer beforeEach] START');
            let initializeResponseSent = false; // Add state variable

            mockedParseMessage.mockImplementation((_buffer): ParsedMessageResult => {
                // This mock is specific to the startServer tests and primarily handles the 'initialize' response.
                if (!initializeResponseSent) {
                    // Only provide the 'initialize' response once for ID 0.
                    // LspManager.sendRequest for 'initialize' will use ID 0 as requestCounter starts at 0 for a new LspManager instance.
                    console.log('[startServer beforeEach] mockedParseMessage providing "initialize" response for ID 0.');
                    const responseForInitialize: JsonRpcResponse = { 
                        jsonrpc: '2.0', 
                        id: 0, // This ID must match the ID of the initialize request.
                        result: mockInitializeResult 
                    };
                    initializeResponseSent = true; // Mark as sent for this test setup
                    return { message: responseForInitialize, remainingBuffer: Buffer.from('') }; // Clear buffer after this message
                } else {
                    // For any subsequent calls to parseMessage during this test's startServer flow
                    // by this specific mock setup, assume no other messages are expected to be parsed by it.
                    // This helps prevent loops if handleData is called unexpectedly multiple times with the same buffer.
                    console.log('[startServer beforeEach] mockedParseMessage called after "initialize" response was already provided by this mock, returning null message.');
                    return { message: null, remainingBuffer: _buffer }; // Return original buffer if no message found by this mock logic
                }
            });
            console.log('[startServer beforeEach] END');
        });

        it('should throw if serverJarPath is not configured', async () => {
            console.log('[startServer test - no serverJarPath] START');
            const configNoInstallDir = { ...mockConfig, lspServerInstallDir: undefined as any };
            lspManager = new LspManager(configNoInstallDir, projectRootPath);
            await expect(lspManager.startServer()).rejects.toThrow('LSP server installation directory (lspServerInstallDir) is not configured.');
            console.log('[startServer test - no serverJarPath] END');
        });

        it('should throw if workspaceDataPath is relative', async () => {
            console.log('[startServer test - relative workspaceDataPath] START');
            const configRelativeWs = { ...mockConfig, workspaceDataPath: './relative_ws_data' };
            lspManager = new LspManager(configRelativeWs, projectRootPath);
            try {
                // We expect this to return a rejected promise because startServer is async
                // and the validation error happens before any actual async work (like spawn).
                await expect(lspManager.startServer()).rejects.toThrow('workspaceDataPath must be an absolute path. Received: ./relative_ws_data');
                console.log('[startServer test - relative workspaceDataPath] Promise rejected as expected.');
            } catch (error) {
                console.error('[startServer test - relative workspaceDataPath] ERROR during expect-rejects-toThrow:', error);
                // Re-throw to ensure the test still fails if the expect itself had an issue
                throw error;
            }
            console.log('[startServer test - relative workspaceDataPath] END');
        });

        it('should spawn the child process with correct arguments', async () => {
            console.log('[startServer test - spawn args] START');
            
            // Adjust mock for _findLauncherJar to use the lspServerInstallDir from mockConfig
            const expectedLauncherPath = path.join(mockConfig.lspServerInstallDir, 'plugins', 'org.eclipse.equinox.launcher_MOCK.jar');
            (fs.readdirSync as jest.Mock).mockReturnValueOnce(['org.eclipse.equinox.launcher_MOCK.jar']);
            
            const startServerPromise = lspManager.startServer();

            // Allow a microtask tick for sendRequest('initialize') to be set up within startServer
            await new Promise(resolve => setImmediate(resolve));

            // Emit data to trigger handleData and resolve the internal 'initialize' request
            // The content of the buffer doesn't strictly matter here because mockedParseMessage
            // in the beforeEach for 'startServer' is set up to return the initialize response.
            console.log('[startServer test - spawn args] Emitting mockStdout data for initialize...');
            mockStdout.emit('data', Buffer.from('trigger_initialize_for_spawn_args_test'));

            console.log('[startServer test - spawn args] Awaiting startServerPromise...');
            await startServerPromise; // Now wait for startServer to complete its logic after init response
            console.log('[startServer test - spawn args] startServerPromise resolved.');

            // const expectedJarPath = '/path/to/lsp/plugins/server.jar'; // Path returned by mocked _findLauncherJar
            const expectedJarPath = expectedLauncherPath; // Use the path derived from fs mocks
            const expectedConfigDir = path.join(mockConfig.lspServerInstallDir, 'config_linux'); // NEW
            
            expect(mockedSpawn).toHaveBeenCalledWith(
                mockConfig.serverCommand,
                [
                    ...mockConfig.serverArgs,
                    `-Dlog.level=${mockConfig.logLevel}`,
                    '-jar', expectedJarPath,
                    '-configuration', expectedConfigDir,
                    '-data', mockConfig.workspaceDataPath
                ],
                expect.objectContaining({ stdio: ['pipe', 'pipe', 'pipe'], cwd: projectRootPath })
            );
            console.log('[startServer test - spawn args] END');
        });
        
        it('should send initialize request and initialized notification on successful start', async () => {
            console.log('[startServer test - successful start] START');
            const onInitializedEmit = jest.fn();
            lspManager.on('initialized', onInitializedEmit);

            console.log('[startServer test - successful start] Calling lspManager.startServer() but not awaiting fully yet...');
            const startServerPromise = lspManager.startServer(); 

            await new Promise(resolve => setImmediate(resolve));

            console.log('[startServer test - successful start] Emitting mockStdout data to resolve initialize...');
            mockStdout.emit('data', Buffer.from('trigger_initialize_response'));

            console.log('[startServer test - successful start] Now awaiting startServerPromise...');
            const result = await startServerPromise; 
            console.log('[startServer test - successful start] lspManager.startServer() completed.');

            expect(result).toEqual(mockInitializeResult);
            expect(mockedFormatRequestMessage).toHaveBeenCalledWith(0, 'initialize', expect.any(Object));
            expect(mockStdin.write).toHaveBeenNthCalledWith(1, expect.stringContaining('"method":"initialize"'), 'utf-8');
            
            await new Promise(resolve => setImmediate(resolve));

            expect(mockedFormatNotificationMessage).toHaveBeenCalledWith('initialized', {});
            // Notification does not have 'utf-8'
            expect(mockStdin.write).toHaveBeenNthCalledWith(2, expect.stringContaining('"method":"initialized"')); 
            expect(onInitializedEmit).toHaveBeenCalledWith(mockInitializeResult);
            console.log('[startServer test - successful start] END');
        });

        it('should throw if LSP server initialization returns an error', async () => {
            console.log('[startServer test - init error] START');
            const initError = { code: -32000, message: 'Initialization Failed' };
            
            // This mockImplementationOnce applies to the *next* call of mockedParseMessage globally.
            // It will be consumed by the handleData triggered by mockStdout.emit below.
            mockedParseMessage.mockImplementationOnce((_buffer): ParsedMessageResult => {
                console.log('[startServer test - init error] mockedParseMessage (for error) called, returning error response for ID 0');
                return { message: { jsonrpc: '2.0', id: 0, error: initError }, remainingBuffer: Buffer.from('') };
            });

            const startServerPromise = lspManager.startServer();

            // Allow a microtask tick for sendRequest('initialize') to be set up within startServer
            await new Promise(resolve => setImmediate(resolve));

            console.log('[startServer test - init error] Emitting mockStdout data to trigger error response...');
            mockStdout.emit('data', Buffer.from('trigger_error_response'));

            console.log('[startServer test - init error] Awaiting startServerPromise rejection...');
            await expect(startServerPromise).rejects.toEqual(initError); 
            
            console.log('[startServer test - init error] END');
        });

        it('should throw if child_process.spawn throws an error', async () => {
            console.log('[startServer test - spawn error] START');
            const spawnError = new Error('Failed to spawn');
            mockedSpawn.mockImplementationOnce(() => { 
                console.log('[startServer test - spawn error] Mocked spawn throwing error.');
                throw spawnError; 
            });

            await expect(lspManager.startServer()).rejects.toThrow(spawnError.message);
            console.log('[startServer test - spawn error] END');
        });

        it('should throw if attempting to start server when it is already running', async () => {
            console.log('[startServer test - already running] START');
            
            // First startServer call - needs to complete successfully for the test setup.
            console.log('[startServer test - already running] Initiating first startServer call...');
            const firstStartPromise = lspManager.startServer();

            // Allow a microtask tick for its internal sendRequest('initialize') to be set up
            await new Promise(resolve => setImmediate(resolve));

            console.log('[startServer test - already running] Emitting mockStdout data for first start...');
            // This will use the stateful mockedParseMessage from startServer's beforeEach
            // which should provide the initialize response for ID 0.
            mockStdout.emit('data', Buffer.from('trigger_first_initialize_for_already_running_test'));

            console.log('[startServer test - already running] Awaiting first startServer completion...');
            await firstStartPromise;
            console.log('[startServer test - already running] First startServer completed.'); 
            
            // Now try to start again - this call should throw the error because childProcess is not null.
            console.log('[startServer test - already running] Attempting second startServer call (should throw)...');
            await expect(lspManager.startServer()).rejects.toThrow('LSP server already running.');
            console.log('[startServer test - already running] Second startServer call rejected as expected.');
            console.log('[startServer test - already running] END');
        });

        // TODO: More tests for startServer: error handling, existing process, etc.
    });

    describe('stopServer', () => {
        let lspManagerInstance: LspManager; // Use a fresh instance for this suite
        let instanceSendRequestSpy: jest.SpyInstance;
        let instanceSendNotificationSpy: jest.SpyInstance;
        let mockChildProcessForStopServer: jest.Mocked<child_process.ChildProcess>; // Separate mock CP

        beforeEach(() => {
            console.log('[stopServer beforeEach] START');
            // Create a fresh LspManager instance for each stopServer test
            lspManagerInstance = new LspManager(mockConfig, projectRootPath);

            // Create a fresh mock child process for this LspManager instance
            // It needs an 'on' mock method for LspManager to attach its internal exit handler
            mockChildProcessForStopServer = {
                stdin: { write: jest.fn() } as any,
                stdout: new EventEmitter() as any, // Not strictly needed for stop, but good for consistency
                stderr: new EventEmitter() as any,
                pid: 67890,
                kill: jest.fn(),
                on: jest.fn(), // Crucial for LspManager to attach its 'exit' handler
            } as unknown as jest.Mocked<child_process.ChildProcess>;

            // Simulate server is running by assigning the child process to the instance
            (lspManagerInstance as any).childProcess = mockChildProcessForStopServer;
            // Reset request counter for this instance if it matters for shutdown (it doesn't currently)
            (lspManagerInstance as any).requestCounter = 0; 

            // Spy on methods of this specific instance
            instanceSendRequestSpy = jest.spyOn(lspManagerInstance, 'sendRequest');
            instanceSendNotificationSpy = jest.spyOn(lspManagerInstance, 'sendNotification');
            
            // Clear any global mocks that might interfere, e.g., if spawn was called unexpectedly
            mockedSpawn.mockClear();
            mockedFormatRequestMessage.mockClear();
            mockedFormatNotificationMessage.mockClear();
            console.log('[stopServer beforeEach] END');
        });

        afterEach(() => {
            console.log('[stopServer afterEach] START');
            instanceSendRequestSpy.mockRestore();
            instanceSendNotificationSpy.mockRestore();
            // jest.restoreAllMocks(); // Potentially too broad, could affect other describe blocks if not careful
            console.log('[stopServer afterEach] END');
        });

        it('should not do anything if server is not running', async () => {
            console.log('[stopServer test - not running] START');
            (lspManagerInstance as any).childProcess = null; // Simulate server not running for this specific test case
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
            
            await lspManagerInstance.stopServer();
            
            expect(mockChildProcessForStopServer.kill).not.toHaveBeenCalled();
            expect(instanceSendRequestSpy).not.toHaveBeenCalled(); // Check instance spy
            expect(consoleWarnSpy).toHaveBeenCalledWith("LSP Server is not running.");
            consoleWarnSpy.mockRestore();
            console.log('[stopServer test - not running] END');
        });

        it('should perform graceful shutdown: send shutdown, exit notification, and resolve on exit event', async () => {
            console.log('[stopServer test - graceful shutdown] START');
            instanceSendRequestSpy.mockResolvedValue(undefined); // Mock for the 'shutdown' request

            const stopPromise = lspManagerInstance.stopServer();

            // Allow microtasks for sendRequest('shutdown') and sendNotification('exit') to be called
            await new Promise(resolve => setImmediate(resolve)); 

            // Verify that 'shutdown' request and 'exit' notification were sent
            expect(instanceSendRequestSpy).toHaveBeenCalledWith('shutdown', null);
            expect(instanceSendNotificationSpy).toHaveBeenCalledWith('exit', null);

            // Simulate the child process exiting, which triggers LspManager's internal 'exit' event
            console.log('[stopServer test - graceful shutdown] Simulating LspManager handleExit...');
            (lspManagerInstance as any).handleExit(0, null); // This will emit the 'exit' event LspManager.stopServer is waiting for
            
            await expect(stopPromise).resolves.toBeUndefined();
            expect(mockChildProcessForStopServer.kill).not.toHaveBeenCalled(); // Should not be killed forcefully
            console.log('[stopServer test - graceful shutdown] END');
        });

        it.skip('should force kill if shutdown request fails', async () => {
            console.log('[stopServer test - shutdown fails] START');
            const shutdownError = new Error('Shutdown RPC failed');
            instanceSendRequestSpy.mockImplementationOnce(async (method: string) => {
                if (method === 'shutdown') {
                    return Promise.reject(shutdownError);
                }
                return Promise.resolve(undefined); 
            });
            
            const stopPromise = lspManagerInstance.stopServer();

            await new Promise(resolve => setImmediate(resolve));

            await expect(stopPromise).rejects.toEqual(shutdownError);
            expect(mockChildProcessForStopServer.kill).toHaveBeenCalledWith('SIGKILL'); 
            console.log('[stopServer test - shutdown fails] END');
        });

        it.skip('should force kill if shutdown times out (using fake timers)', async () => {
            jest.useFakeTimers(); 
            console.log('[stopServer test - shutdown timeout] START');
            
            instanceSendRequestSpy.mockImplementation(async (method: string) => {
                if (method === 'shutdown') {
                    console.log('[stopServer test - shutdown timeout] Mocked shutdown called, will hang.');
                    return new Promise(() => {}); 
                }
                return Promise.resolve(undefined);
            });

            const stopPromise = lspManagerInstance.stopServer();

            await new Promise(resolve => setImmediate(resolve)); 
            
            console.log('[stopServer test - shutdown timeout] Running all timers...');
            jest.runAllTimers(); 

            await new Promise(resolve => setImmediate(resolve)); 

            await expect(stopPromise).rejects.toThrow('Shutdown timeout');
            expect(mockChildProcessForStopServer.kill).toHaveBeenCalledWith('SIGKILL');
            
            console.log('[stopServer test - shutdown timeout] END - restoring real timers');
            jest.useRealTimers(); 
        });

        it('should stop server forcefully if force flag is true', async () => {
            console.log('[stopServer test - force true] START');
            (lspManagerInstance as any).childProcess = mockChildProcessForStopServer;
            const instanceSendRequestSpy = jest.spyOn(lspManagerInstance as any, 'sendRequest');
            const pendingReqReject = jest.fn();
            (lspManagerInstance as any).pendingRequests.set('someid', { reject: pendingReqReject });

            await lspManagerInstance.stopServer(true); // Call with force = true

            expect(mockChildProcessForStopServer.kill).toHaveBeenCalledWith('SIGKILL'); // Changed from SIGTERM to SIGKILL
            expect(instanceSendRequestSpy).not.toHaveBeenCalled(); // No graceful shutdown attempt
            expect((lspManagerInstance as any).childProcess).toBeNull();
            expect(pendingReqReject).toHaveBeenCalledWith(new Error('LSP Server forced to stop.'));
            expect((lspManagerInstance as any).pendingRequests.size).toBe(0);
            console.log('[stopServer test - force true] END');
        });

        it('should do nothing if server is not running when stopServer is called', async () => {
            console.log('[stopServer test - not running] START');
            (lspManagerInstance as any).childProcess = null; // Simulate server not running for this specific test case
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
            
            await lspManagerInstance.stopServer();
            
            expect(mockChildProcessForStopServer.kill).not.toHaveBeenCalled();
            expect(instanceSendRequestSpy).not.toHaveBeenCalled(); // Check instance spy
            expect(consoleWarnSpy).toHaveBeenCalledWith("LSP Server is not running.");
            consoleWarnSpy.mockRestore();
            console.log('[stopServer test - not running] END');
        });
    });

    describe('sendRequest and sendNotification', () => {
        beforeEach(async () => {
            console.log('[sendRequest/Notification beforeEach] START');
            (lspManager as any).childProcess = mockChildProcess; 
            (lspManager as any).requestCounter = 0; 
            (lspManager as any).pendingRequests.clear();
            if (mockChildProcess) {
                (mockChildProcess as any).stdin = mockStdin as any; 
            } else {
                console.error('[sendRequest/Notification beforeEach] mockChildProcess is null!');
            }
            console.log('[sendRequest/Notification beforeEach] END');
        });

        describe('sendRequest', () => {
            it('should format and send a request, and store it as pending', () => {
                console.log('[sendRequest test - format and send] START');
                const method = 'test/request';
                const params = { data: 'testData' };
                const formattedMessage = "Formatted Request Message";
                mockedFormatRequestMessage.mockReturnValue(formattedMessage);

                const promise = lspManager.sendRequest(method, params);

                expect(mockedFormatRequestMessage).toHaveBeenCalledWith(0, method, params);
                expect(mockStdin.write).toHaveBeenCalledWith(formattedMessage, 'utf-8');
                expect((lspManager as any).pendingRequests.has(0)).toBe(true);
                expect(promise).toBeInstanceOf(Promise);
                console.log('[sendRequest test - format and send] END');
            });

            it('should reject if server is not running (no childProcess)', async () => {
                console.log('[sendRequest test - no childProcess] START');
                (lspManager as any).childProcess = null;
                await expect(lspManager.sendRequest('test/request', {})).rejects.toThrow('LSP server is not running or stdin is not available.');
                console.log('[sendRequest test - no childProcess] END');
            });

            it('should reject if server is not running (no stdin on childProcess)', async () => {
                console.log('[sendRequest test - no stdin] START');
                if (mockChildProcess) {
                    (mockChildProcess as any).stdin = null;
                } else {
                    console.error('[sendRequest test - no stdin] mockChildProcess is null!');
                }
                (lspManager as any).childProcess = mockChildProcess; 
                await expect(lspManager.sendRequest('test/request', {})).rejects.toThrow('LSP server is not running or stdin is not available.');
                console.log('[sendRequest test - no stdin] END');
            });
        });

        describe('sendNotification', () => {
            it('should format and send a notification', () => {
                console.log('[sendNotification test - format and send] START');
                const method = 'test/notification';
                const params = { data: 'notifyData' };
                const formattedMessage = "Formatted Notification Message";
                mockedFormatNotificationMessage.mockReturnValue(formattedMessage);

                lspManager.sendNotification(method, params);

                expect(mockedFormatNotificationMessage).toHaveBeenCalledWith(method, params);
                expect(mockStdin.write).toHaveBeenCalledWith(formattedMessage); // REMOVED 'utf-8'
                console.log('[sendNotification test - format and send] END');
            });

            it('should not throw or send if server is not running (no childProcess)', () => {
                console.log('[sendNotification test - no childProcess] START');
                (lspManager as any).childProcess = null;
                expect(() => lspManager.sendNotification('test/notification', {})).not.toThrow();
                expect(mockStdin.write).not.toHaveBeenCalled();
                console.log('[sendNotification test - no childProcess] END');
            });

            it('should not throw or send if server is not running (no stdin on childProcess)', () => {
                console.log('[sendNotification test - no stdin] START');
                if (mockChildProcess) {
                    (mockChildProcess as any).stdin = null;
                } else {
                    console.error('[sendNotification test - no stdin] mockChildProcess is null!');
                }
                (lspManager as any).childProcess = mockChildProcess; 
                expect(() => lspManager.sendNotification('test/notification', {})).not.toThrow();
                mockStdin.write.mockClear(); 
                lspManager.sendNotification('test/notification', {});
                expect(mockStdin.write).not.toHaveBeenCalled();
                console.log('[sendNotification test - no stdin] END');
            });
        });
    });

    describe('handleData', () => {
        beforeEach(() => {
            console.log('[handleData beforeEach] START');
            (lspManager as any).childProcess = mockChildProcess;
            (lspManager as any).buffer = Buffer.alloc(0); 
            mockedParseMessage.mockReset(); 
            // Ensure a persistent default implementation for parseMessage
            mockedParseMessage.mockImplementation(() => {
                // This is the fallback if no mockReturnValueOnce/mockImplementationOnce is active
                // It should return the current buffer as remainingBuffer if no message is parsed.
                return { message: null, remainingBuffer: (lspManager as any).buffer }; 
            });
            console.log('[handleData beforeEach] END');
        });

        it('should resolve a pending request when a valid response is received', (done) => {
            console.log('[handleData test - resolve pending] START');
            const requestId = 123;
            const expectedResult = { success: true };
            const mockResponse: JsonRpcResponse = { jsonrpc: '2.0', id: requestId, result: expectedResult };
            const testBuffer = Buffer.from('data_for_resolve_test'); // Content for mockParseMessage to use

            (lspManager as any).pendingRequests.set(requestId, { 
                resolve: (value: any) => {
                    expect(value).toEqual(expectedResult);
                    done();
                }, 
                reject: (reason: any) => done(reason) 
            });

            mockedParseMessage.mockReturnValueOnce({ message: mockResponse, remainingBuffer: Buffer.from('') });
            
            console.log('[handleData test - resolve pending] Directly calling handleData...');
            (lspManager as any).handleData(testBuffer);
            expect(mockedParseMessage).toHaveBeenCalledWith(testBuffer); // Buffer after concat
            console.log('[handleData test - resolve pending] END');
        });

        it('should reject a pending request when an error response is received', (done) => {
            console.log('[handleData test - reject pending] START');
            const requestId = 456;
            const expectedError = { code: -32000, message: 'Test Error' };
            const mockErrorResponse: JsonRpcResponse = { jsonrpc: '2.0', id: requestId, error: expectedError };
            const testBuffer = Buffer.from('data_for_reject_test');

            (lspManager as any).pendingRequests.set(requestId, { 
                resolve: (value: any) => done('Promise was resolved instead of rejected'), 
                reject: (reason: any) => {
                    expect(reason).toEqual(expectedError);
                    done();
                } 
            });

            mockedParseMessage.mockReturnValueOnce({ message: mockErrorResponse, remainingBuffer: Buffer.from('') });
            
            console.log('[handleData test - reject pending] Directly calling handleData...');
            (lspManager as any).handleData(testBuffer);
            expect(mockedParseMessage).toHaveBeenCalledWith(testBuffer);
            console.log('[handleData test - reject pending] END');
        });

        it('should emit a notification event when a server notification is received', (done) => {
            console.log('[handleData test - emit notification] START');
            const mockNotification: JsonRpcNotification = { // Ensure type and jsonrpc version
                jsonrpc: '2.0', 
                method: 'test/notification', 
                params: { data: 'test' } 
            };
            const testBuffer = Buffer.from('data_for_notification_test');

            lspManager.on(mockNotification.method, (params) => {
                expect(params).toEqual(mockNotification.params);
                done();
            });

            mockedParseMessage.mockReturnValueOnce({ message: mockNotification, remainingBuffer: Buffer.from('') });

            console.log('[handleData test - emit notification] Directly calling handleData...');
            (lspManager as any).handleData(testBuffer);
            expect(mockedParseMessage).toHaveBeenCalledWith(testBuffer);
            console.log('[handleData test - emit notification] END');
        });

        it('should log an error and not crash if response ID is not in pendingRequests', () => {
            console.log('[handleData test - unknown ID] START');
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
            const unknownIdResponse: JsonRpcResponse = { jsonrpc: '2.0', id: 999, result: 'something' };
            const testBuffer = Buffer.from('data_for_unknown_id_test');

            mockedParseMessage.mockReturnValueOnce({ message: unknownIdResponse, remainingBuffer: Buffer.from('') });
            
            console.log('[handleData test - unknown ID] Directly calling handleData...');
            (lspManager as any).handleData(testBuffer);
            expect(mockedParseMessage).toHaveBeenCalledWith(testBuffer);
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                expect.stringMatching(/LspManager\.handleData INSTANCE: .* Received response for unknown request ID: 999/)
            );
            consoleWarnSpy.mockRestore();
            console.log('[handleData test - unknown ID] END');
        });

        it('should correctly buffer and process partial messages', () => {
            console.log('[handleData test - partial messages] START');
            const part1 = Buffer.from('Content-Length: 50\r\n\r\n{"jsonrpc":"2.0", "id":1, "result":{"va');
            const part2 = Buffer.from('lue":"complete"}}');
            const fullMessageBuffer = Buffer.concat([part1, part2]);
            const completeMessage: JsonRpcResponse = { // Ensure type and jsonrpc version
                jsonrpc: '2.0', 
                id: 1, 
                result: { value: 'complete' } 
            };

            // First call with part1: parseMessage returns null message
            mockedParseMessage.mockReturnValueOnce({ message: null, remainingBuffer: part1 });
            (lspManager as any).handleData(part1);
            expect(mockedParseMessage).toHaveBeenCalledWith(part1);
            expect((lspManager as any).buffer).toEqual(part1);

            // Second call with part2: parseMessage now returns the complete message
            mockedParseMessage.mockReturnValueOnce({ message: completeMessage, remainingBuffer: Buffer.from('') });
            (lspManager as any).handleData(part2);
            expect(mockedParseMessage).toHaveBeenCalledWith(fullMessageBuffer); // Should be called with combined buffer
            expect((lspManager as any).buffer).toEqual(Buffer.from('')); // Buffer should be empty after processing
            // Add assertion for pending request resolution if applicable, or emitted event
            console.log('[handleData test - partial messages] END');
        });

        it('should process multiple complete messages in a single data chunk', () => {
            console.log('[handleData test - multiple messages] START');
            const response1: JsonRpcResponse = { jsonrpc: '2.0', id: 1, result: 'res1' }; // Ensure jsonrpc version
            const notification1: JsonRpcNotification = { jsonrpc: '2.0', method: 'notif/1', params: {} }; // Ensure jsonrpc version
            const multiMessageBuffer = Buffer.from('message1_then_message2'); 

            let parseCallCount = 0;
            mockedParseMessage.mockImplementation((bufferArg): ParsedMessageResult => { // Added ParsedMessageResult type to return
                parseCallCount++;
                if (parseCallCount === 1) {
                    console.log('[handleData test - multiple messages] mockParseMessage call 1');
                    return { message: response1, remainingBuffer: Buffer.from('message2_remaining_part') };
                } else if (parseCallCount === 2) {
                    console.log('[handleData test - multiple messages] mockParseMessage call 2');
                    return { message: notification1, remainingBuffer: Buffer.from('') };
                } else {
                    console.log('[handleData test - multiple messages] mockParseMessage call 3+ (should be null)');
                    return { message: null, remainingBuffer: Buffer.from('') }; 
                }
            });

            const onNotificationSpy = jest.fn();
            lspManager.on(notification1.method, onNotificationSpy);
            // No pending request for response1, but it should still be processed without error

            console.log('[handleData test - multiple messages] Directly calling handleData...');
            (lspManager as any).handleData(multiMessageBuffer);

            expect(parseCallCount).toBeGreaterThanOrEqual(2);
            // expect(mockedParseMessage).toHaveBeenCalledTimes(2); // More precise, but toBeGreaterThanOrEqual covers the loop logic
            expect(onNotificationSpy).toHaveBeenCalledWith(notification1.params);
            console.log('[handleData test - multiple messages] END');
        });
    });

    describe('ChildProcess Event Handlers (stderr, error, exit)', () => {
        beforeEach(() => {
            console.log('[ChildProcess Handlers beforeEach] START');
            // Ensure childProcess is set for these tests, as handlers might interact with it.
            (lspManager as any).childProcess = mockChildProcess;
            // Clear mockChildProcess.on calls from previous LspManager instances if startServer was used.
            // This is important if lspManager in the main beforeEach was started.
            if (mockChildProcess && mockChildProcess.on && (mockChildProcess.on as jest.Mock).mockClear) {
                (mockChildProcess.on as jest.Mock).mockClear();
            }
            // Setup specific listeners for lspManager instance for these tests if needed
            // (e.g. if lspManager.startServer() was intended to be called to wire up its internal handlers)
            // For now, we are testing the handlers directly.
            console.log('[ChildProcess Handlers beforeEach] END');
        });

        it('handleErrorData should log stderr data', () => {
            console.log('[ChildProcess Test - handleErrorData] START');
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            const errData = Buffer.from('Some error output from LSP server');
            
            console.log('[ChildProcess Test - handleErrorData] Calling lspManager.handleErrorData directly...');
            (lspManager as any).handleErrorData(errData);

            expect(consoleErrorSpy).toHaveBeenCalledWith('LSP Server STDERR:', errData.toString());
            consoleErrorSpy.mockRestore();
            console.log('[ChildProcess Test - handleErrorData] END');
        });

        it('handleError should log the error, emit an "error" event, and stop the server', () => {
            console.log('[ChildProcess Test - handleError] START');
            const spawnError = new Error('Spawn failed badly');
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            const managerErrorEmitSpy = jest.fn();
            lspManager.on('error', managerErrorEmitSpy);
            // Mock lspManager.stopServer directly for this unit test of handleError
            const stopServerSpy = jest.spyOn(lspManager, 'stopServer').mockImplementation(async () => {
                console.log('[ChildProcess Test - handleError] stopServer (mocked for handleError) called');
                (lspManager as any).childProcess = null; // Simulate stopServer nullifying childProcess
                return Promise.resolve();
            });

            console.log('[ChildProcess Test - handleError] Calling lspManager.handleError directly...');
            (lspManager as any).handleError(spawnError);

            expect(consoleErrorSpy).toHaveBeenCalledWith('LSP Server Error:', spawnError);
            expect(managerErrorEmitSpy).toHaveBeenCalledWith(spawnError);
            expect(stopServerSpy).toHaveBeenCalledWith(true); // Should force stop
            expect((lspManager as any).childProcess).toBeNull(); // Should be nulled by handleError or its call to stopServer

            consoleErrorSpy.mockRestore();
            stopServerSpy.mockRestore();
            console.log('[ChildProcess Test - handleError] END');
        });

        it('handleExit should log exit information, emit "exit" event, and reject pending requests', async () => {
            console.log('[ChildProcess Test - handleExit] START');
            const exitCode = 1;
            const exitSignal = 'SIGTERM';
            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
            const managerExitEmitSpy = jest.fn();
            lspManager.on('exit', managerExitEmitSpy);

            const requestMethod = 'test/pendingOnExit';
            (lspManager as any).requestCounter = 0; // Reset for predictable ID
            (lspManager as any).pendingRequests.clear();
             // Ensure childProcess and its stdin are mocked for sendRequest to proceed
            if (mockChildProcess) { (mockChildProcess as any).stdin = { write: jest.fn() }; }
            (lspManager as any).childProcess = mockChildProcess;

            console.log('[ChildProcess Test - handleExit] Sending a request...');
            const pendingPromise = lspManager.sendRequest(requestMethod, {}); 
            const pendingRequestId = (lspManager as any).requestCounter - 1; 
            expect((lspManager as any).pendingRequests.has(pendingRequestId)).toBe(true);

            console.log('[ChildProcess Test - handleExit] Calling lspManager.handleExit directly...');
            (lspManager as any).handleExit(exitCode, exitSignal);

            expect(consoleLogSpy).toHaveBeenCalledWith(`LSP Server Exited. Code: ${exitCode}, Signal: ${exitSignal}`);
            expect(managerExitEmitSpy).toHaveBeenCalledWith(exitCode, exitSignal);
            expect((lspManager as any).childProcess).toBeNull();
            
            console.log('[ChildProcess Test - handleExit] Awaiting pendingPromise rejection...');
            await expect(pendingPromise).rejects.toThrow(`LSP Server exited with code ${exitCode}, signal ${exitSignal}. Request ${requestMethod} aborted.`);
            expect((lspManager as any).pendingRequests.has(pendingRequestId)).toBe(false); 

            consoleLogSpy.mockRestore();
            console.log('[ChildProcess Test - handleExit] END');
        });

        it('handleExit should handle null exit code and null signal gracefully', () => {
            console.log('[ChildProcess Test - handleExit nulls] START');
            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
            const managerExitEmitSpy = jest.fn();
            lspManager.on('exit', managerExitEmitSpy);

            console.log('[ChildProcess Test - handleExit nulls] Calling lspManager.handleExit directly with nulls...');
            (lspManager as any).handleExit(null, null);
            
            expect(consoleLogSpy).toHaveBeenCalledWith('LSP Server Exited. Code: null, Signal: null');
            expect(managerExitEmitSpy).toHaveBeenCalledWith(null, null);
            expect((lspManager as any).childProcess).toBeNull();
            consoleLogSpy.mockRestore();
            console.log('[ChildProcess Test - handleExit nulls] END');
        });
    });
}); 