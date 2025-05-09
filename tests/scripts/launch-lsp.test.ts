import * as fs from 'fs';
import * as child_process from 'child_process';
import * as os from 'os';
import * as path from 'path';
import { launchLspServer, ProcessLike } from '../../src/scripts/launch-lsp'; // Adjust path as needed

// Mock the core modules
jest.mock('fs');
jest.mock('child_process');
jest.mock('os');

// Helper to cast to jest.Mock
const fsMock = fs as jest.Mocked<typeof fs>;
const childProcessMock = child_process as jest.Mocked<typeof child_process>;
const osMock = os as jest.Mocked<typeof os>;

describe('launchLspServer', () => {
    let mockProcess: ProcessLike;
    // Standard __dirname for a file in tests/scripts/
    const projectBasePath = path.resolve(__dirname, '..', '..'); 
    const lspServerBaseDir = path.join(projectBasePath, 'bin', 'eclipse.jdt.ls');
    const pluginsDir = path.join(lspServerBaseDir, 'plugins');
    const pidFile = path.join(projectBasePath, '.lsp.pid');
    const logDir = path.join(projectBasePath, 'logs');
    const lspLogFile = path.join(logDir, 'lsp.log');
    const lspErrFile = path.join(logDir, 'lsp.err.log');
    
    const sampleProjectPath = path.join(projectBasePath, 'tests', 'fixtures', 'SampleJavaProject');
    const workspaceDataDir = path.join(sampleProjectPath, '.jdt.ls-workspace-data');


    beforeEach(() => {
        // Reset all mocks before each test
        jest.resetAllMocks();

        // Default mock process for most tests
        mockProcess = {
            env: {}, // Default to no JAVA_HOME
            kill: jest.fn(),
            exit: jest.fn() as jest.Mock<never, [number?]>, // Corrected type for jest.fn
        };

        // Default fs mocks
        (fsMock.existsSync as jest.MockedFunction<typeof fs.existsSync>).mockReturnValue(true); // Assume files/dirs exist unless specified
        (fsMock.readdirSync as jest.MockedFunction<typeof fs.readdirSync>).mockReturnValue([]);
        (fsMock.statSync as jest.MockedFunction<typeof fs.statSync>).mockReturnValue({ isDirectory: () => true } as fs.Stats);
        (fsMock.openSync as jest.MockedFunction<typeof fs.openSync>).mockReturnValue(123); // Mock file descriptor
        (fsMock.mkdirSync as jest.MockedFunction<typeof fs.mkdirSync>).mockReturnValue(undefined);
        (fsMock.writeFileSync as jest.MockedFunction<typeof fs.writeFileSync>).mockReturnValue(undefined);
        (fsMock.readFileSync as jest.MockedFunction<typeof fs.readFileSync>).mockReturnValue('');
        (fsMock.unlinkSync as jest.MockedFunction<typeof fs.unlinkSync>).mockReturnValue(undefined);
        (fsMock.closeSync as jest.MockedFunction<typeof fs.closeSync>).mockReturnValue(undefined);


        // Default os mocks
        (osMock.platform as jest.MockedFunction<typeof os.platform>).mockReturnValue('linux'); // Default to Linux

        // Default child_process mocks
        const mockSpawnProcess = {
            pid: 12345,
            unref: jest.fn(),
            on: jest.fn(), // For 'error' and 'exit' listeners if any were attached
            stdout: { on: jest.fn() },
            stderr: { on: jest.fn() },
        } as unknown as child_process.ChildProcess;
        (childProcessMock.spawn as jest.MockedFunction<typeof child_process.spawn>).mockReturnValue(mockSpawnProcess);
        (childProcessMock.execSync as jest.MockedFunction<typeof child_process.execSync>).mockReturnValue(Buffer.from('java version "11.0.x"')); // Mock java -version success

        // Mock console.log, console.error, console.warn to spy on them
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        // Restore original console functions
        jest.restoreAllMocks();
    });

    // --- Test cases will go here ---

    describe('Pre-launch checks and setup', () => {
        it('should return null if launcher JAR is not found', () => {
            (fsMock.readdirSync as jest.MockedFunction<typeof fs.readdirSync>).mockReturnValue([]); // No files in plugins dir
            const result = launchLspServer(sampleProjectPath, mockProcess);
            expect(result).toBeNull();
            expect(console.error).toHaveBeenCalledWith('Error: Could not find the Eclipse JDT LS launcher JAR.');
        });

        it('should return null if plugins directory does not exist', () => {
            // Specifically for findLauncherJar part
            (fsMock.existsSync as jest.MockedFunction<typeof fs.existsSync>).mockImplementation((p) => p !== pluginsDir);
            const result = launchLspServer(sampleProjectPath, mockProcess);
            expect(result).toBeNull();
            expect(console.error).toHaveBeenCalledWith(`Error: Plugins directory not found: ${pluginsDir}`);
        });
        
        it('should return null if OS-specific config directory does not exist', () => {
            (osMock.platform as jest.MockedFunction<typeof os.platform>).mockReturnValue('darwin'); // e.g., config_mac
            const configMacDir = path.join(lspServerBaseDir, 'config_mac');
            (fsMock.existsSync as jest.MockedFunction<typeof fs.existsSync>).mockImplementation(p => {
                if (p === configMacDir) return false; // Config dir doesn't exist
                if (p === pluginsDir) return true; // Plugins dir exists
                return true; // Other paths exist
            });
            // Ensure readdirSync returns a string array for this test
            (fsMock.readdirSync as jest.MockedFunction<typeof fs.readdirSync>)
                .mockReturnValue(['org.eclipse.equinox.launcher_MOCK.jar'] as any); 

            const result = launchLspServer(sampleProjectPath, mockProcess);
            expect(result).toBeNull();
            expect(console.error).toHaveBeenCalledWith(
                `OS-specific configuration directory not found: ${configMacDir}. The LSP server installation might be incomplete or corrupted.`
            );
        });

        it('should return null if projectPath does not exist', () => {
            (fsMock.readdirSync as jest.MockedFunction<typeof fs.readdirSync>)
                .mockReturnValue(['org.eclipse.equinox.launcher_MOCK.jar'] as any); // Ensure launcher found
            (osMock.platform as jest.MockedFunction<typeof os.platform>).mockReturnValue('linux');
            const configLinuxDir = path.join(lspServerBaseDir, 'config_linux');
            (fsMock.existsSync as jest.MockedFunction<typeof fs.existsSync>).mockImplementation(p => {
                if (p === sampleProjectPath) return false;
                if (p === pluginsDir) return true;
                if (p === configLinuxDir) return true;
                return true;
            });

            const result = launchLspServer(sampleProjectPath, mockProcess);
            expect(result).toBeNull();
            expect(console.error).toHaveBeenCalledWith(`Error: Java project path does not exist: ${path.resolve(sampleProjectPath)}`);
        });

        it('should return null if projectPath is not a directory', () => {
            (fsMock.readdirSync as jest.MockedFunction<typeof fs.readdirSync>)
                .mockReturnValue(['org.eclipse.equinox.launcher_MOCK.jar'] as any);
            (fsMock.statSync as jest.MockedFunction<typeof fs.statSync>).mockReturnValue({ isDirectory: () => false } as fs.Stats);
            // Ensure other necessary paths exist
            (osMock.platform as jest.MockedFunction<typeof os.platform>).mockReturnValue('linux');
            const configLinuxDir = path.join(lspServerBaseDir, 'config_linux');
            (fsMock.existsSync as jest.MockedFunction<typeof fs.existsSync>).mockImplementation(p => {
                 if (p === pluginsDir) return true;
                 if (p === configLinuxDir) return true;
                 if (p === sampleProjectPath) return true; // Path itself exists
                 return true;
            });

            const result = launchLspServer(sampleProjectPath, mockProcess);
            expect(result).toBeNull();
            expect(console.error).toHaveBeenCalledWith(`Error: Java project path is not a directory: ${path.resolve(sampleProjectPath)}`);
        });

        it('should attempt to create workspaceDataDir if it does not exist', () => {
            (fsMock.readdirSync as jest.MockedFunction<typeof fs.readdirSync>)
                .mockReturnValue(['org.eclipse.equinox.launcher_MOCK.jar'] as any);
            (fsMock.existsSync as jest.MockedFunction<typeof fs.existsSync>).mockImplementation(p => {
                if (p === workspaceDataDir) return false; // Workspace data dir does not exist
                // Ensure other necessary paths exist
                if (p === pluginsDir) return true;
                if (p === path.join(lspServerBaseDir, 'config_linux')) return true;
                if (p === sampleProjectPath) return true;
                if (p === logDir) return true; // log dir exists
                return true;
            });
            (fsMock.statSync as jest.MockedFunction<typeof fs.statSync>).mockReturnValue({ isDirectory: () => true } as fs.Stats);


            launchLspServer(sampleProjectPath, mockProcess);
            expect(fsMock.mkdirSync).toHaveBeenCalledWith(workspaceDataDir, { recursive: true });
        });

        it('should return null if creating workspaceDataDir fails', () => {
            (fsMock.readdirSync as jest.MockedFunction<typeof fs.readdirSync>)
                .mockReturnValue(['org.eclipse.equinox.launcher_MOCK.jar'] as any);
            (fsMock.existsSync as jest.MockedFunction<typeof fs.existsSync>).mockImplementation(p => p !== workspaceDataDir); // workspace data dir doesn't exist
            (fsMock.mkdirSync as jest.MockedFunction<typeof fs.mkdirSync>).mockImplementation(() => { throw new Error('Mock fs.mkdirSync error'); });
            (fsMock.statSync as jest.MockedFunction<typeof fs.statSync>).mockReturnValue({ isDirectory: () => true } as fs.Stats);


            const result = launchLspServer(sampleProjectPath, mockProcess);
            expect(result).toBeNull();
            expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Error creating LSP workspace data directory'));
        });
        
        it('should create log directory if it does not exist', () => {
            (fsMock.readdirSync as jest.MockedFunction<typeof fs.readdirSync>)
                .mockReturnValue(['org.eclipse.equinox.launcher_MOCK.jar'] as any);
            (fsMock.existsSync as jest.MockedFunction<typeof fs.existsSync>).mockImplementation(p => {
                if (p === logDir) return false; // Log dir does not exist
                // Other necessary paths exist
                if (p === pluginsDir) return true;
                if (p === path.join(lspServerBaseDir, 'config_linux')) return true;
                if (p === sampleProjectPath) return true;
                if (p === workspaceDataDir) return true;
                return true;
            });
            (fsMock.statSync as jest.MockedFunction<typeof fs.statSync>).mockReturnValue({ isDirectory: () => true } as fs.Stats);


            launchLspServer(sampleProjectPath, mockProcess);
            expect(fsMock.mkdirSync).toHaveBeenCalledWith(logDir, { recursive: true });
            expect(console.log).toHaveBeenCalledWith(`Created log directory: ${logDir}`);
        });

        it('should return null if opening log files fails', () => {
            (fsMock.readdirSync as jest.MockedFunction<typeof fs.readdirSync>)
                .mockReturnValue(['org.eclipse.equinox.launcher_MOCK.jar'] as any);
            (fsMock.openSync as jest.MockedFunction<typeof fs.openSync>).mockImplementation(() => { throw new Error('Mock fs.openSync error'); });

            const result = launchLspServer(sampleProjectPath, mockProcess);
            expect(result).toBeNull();
            expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Error opening log files for redirection'));
        });
    });

    describe('PID file handling', () => {
        it('should remove stale PID file if process is not running', () => {
            (fsMock.readdirSync as jest.MockedFunction<typeof fs.readdirSync>)
                .mockReturnValue(['org.eclipse.equinox.launcher_MOCK.jar'] as any);
            (fsMock.existsSync as jest.MockedFunction<typeof fs.existsSync>).mockImplementation(p => p === pidFile || p === pluginsDir || p === path.join(lspServerBaseDir, 'config_linux') || p === sampleProjectPath || p === workspaceDataDir || p === logDir);
            (fsMock.readFileSync as jest.MockedFunction<typeof fs.readFileSync>).mockReturnValue('99999'); // Stale PID
            mockProcess.kill = jest.fn(() => { throw new Error('ESRCH'); }); // Mock process not found

            launchLspServer(sampleProjectPath, mockProcess);
            expect(mockProcess.kill).toHaveBeenCalledWith(99999, 0);
            expect(fsMock.unlinkSync).toHaveBeenCalledWith(pidFile);
            expect(console.log).toHaveBeenCalledWith('Removing stale PID file for PID 99999.');
        });

        it('should warn if PID file exists and process is running', () => {
            (fsMock.readdirSync as jest.MockedFunction<typeof fs.readdirSync>)
                .mockReturnValue(['org.eclipse.equinox.launcher_MOCK.jar'] as any);
            (fsMock.existsSync as jest.MockedFunction<typeof fs.existsSync>).mockImplementation(p => p === pidFile || p === pluginsDir || p === path.join(lspServerBaseDir, 'config_linux') || p === sampleProjectPath || p === workspaceDataDir || p === logDir);
            (fsMock.readFileSync as jest.MockedFunction<typeof fs.readFileSync>).mockReturnValue('12345'); // Existing PID
            mockProcess.kill = jest.fn(() => true); // Mock process IS running

            launchLspServer(sampleProjectPath, mockProcess);
            expect(mockProcess.kill).toHaveBeenCalledWith(12345, 0);
            expect(console.warn).toHaveBeenCalledWith(`LSP server might already be running with PID 12345 (found in ${pidFile}).`);
            expect(fsMock.unlinkSync).not.toHaveBeenCalledWith(pidFile); // Should not remove it
             // Depending on the script's choice, it might return null or proceed.
            // The current script proceeds, so spawn should still be called.
            expect(childProcessMock.spawn).toHaveBeenCalled();
        });
    });
    
    describe('Java Executable and Spawning', () => {
        beforeEach(() => {
            // Ensure necessary files/dirs exist for these tests by default
            (fsMock.readdirSync as jest.MockedFunction<typeof fs.readdirSync>)
                .mockReturnValue(['org.eclipse.equinox.launcher_MOCK.jar'] as any);
            (fsMock.existsSync as jest.MockedFunction<typeof fs.existsSync>).mockReturnValue(true);
            (fsMock.statSync as jest.MockedFunction<typeof fs.statSync>).mockReturnValue({ isDirectory: () => true } as fs.Stats);
            (osMock.platform as jest.MockedFunction<typeof os.platform>).mockReturnValue('linux'); // for config_linux
        });

        it('should use JAVA_HOME for java executable if set', () => {
            mockProcess.env.JAVA_HOME = '/custom/java/home';
            const expectedJavaPath = '/custom/java/home/bin/java';
            
            launchLspServer(sampleProjectPath, mockProcess);
            
            expect(childProcessMock.execSync).toHaveBeenCalledWith(`${expectedJavaPath} -version`, expect.anything());
            expect(childProcessMock.spawn).toHaveBeenCalledWith(expectedJavaPath, expect.any(Array), expect.anything());
        });

        it('should use "java" if JAVA_HOME is not set', () => {
            mockProcess.env.JAVA_HOME = undefined;
            
            launchLspServer(sampleProjectPath, mockProcess);

            expect(childProcessMock.execSync).toHaveBeenCalledWith('java -version', expect.anything());
            expect(childProcessMock.spawn).toHaveBeenCalledWith('java', expect.any(Array), expect.anything());
        });
        
        it('should log error if java -version fails but still attempt to spawn', () => {
            (childProcessMock.execSync as jest.MockedFunction<typeof child_process.execSync>).mockImplementation(() => { throw new Error('java version fail'); });
            
            launchLspServer(sampleProjectPath, mockProcess);
            
            expect(console.error).toHaveBeenCalledWith('Failed to get Java version. Ensure Java is correctly installed and in PATH.');
            expect(childProcessMock.spawn).toHaveBeenCalled(); // Should still try to spawn
        });

        it('should spawn LSP server with correct arguments and options', () => {
            (osMock.platform as jest.MockedFunction<typeof os.platform>).mockReturnValue('darwin'); // test config_mac
            const expectedLauncherJar = path.join(pluginsDir, 'org.eclipse.equinox.launcher_MOCK.jar');
            const expectedConfigDir = path.join(lspServerBaseDir, 'config_mac');
            
            // Mock openSync to return distinct file descriptors for logs
            const mockLogFd = 10;
            const mockErrFd = 11;
            (fsMock.openSync as jest.MockedFunction<typeof fs.openSync>).mockImplementation((p) => {
                if (p === lspLogFile) return mockLogFd;
                if (p === lspErrFile) return mockErrFd;
                return 0 as any; // Should not happen, satisfy typing
            });

            launchLspServer(sampleProjectPath, mockProcess);

            const expectedServerArgs = [
                '-Declipse.application=org.eclipse.jdt.ls.core.id1',
                '-Dosgi.bundles.defaultStartLevel=4',
                '-Declipse.product=org.eclipse.jdt.ls.core.product',
                '-Dlog.level=ALL',
                '-Xmx1G',
                '--add-modules=ALL-SYSTEM',
                '--add-opens', 'java.base/java.util=ALL-UNNAMED',
                '--add-opens', 'java.base/java.lang=ALL-UNNAMED',
                '-jar', expectedLauncherJar,
                '-configuration', expectedConfigDir,
                '-data', workspaceDataDir
            ];

            expect(childProcessMock.spawn).toHaveBeenCalledWith(
                'java', // Assuming no JAVA_HOME in mockProcess.env for this specific check
                expectedServerArgs,
                expect.objectContaining({
                    detached: true,
                    stdio: ['ignore', mockLogFd, mockErrFd]
                })
            );
        });

        it('should write PID to PID_FILE and unref the process on successful spawn', () => {
            const mockSpawnedProcess = {
                pid: 7890,
                unref: jest.fn(),
                on: jest.fn(), stdout: { on: jest.fn() }, stderr: { on: jest.fn() },
            } as unknown as child_process.ChildProcess;
            (childProcessMock.spawn as jest.MockedFunction<typeof child_process.spawn>).mockReturnValue(mockSpawnedProcess);

            const result = launchLspServer(sampleProjectPath, mockProcess);
            
            expect(result).toBe(mockSpawnedProcess);
            expect(fsMock.writeFileSync).toHaveBeenCalledWith(pidFile, '7890', 'utf8');
            expect(mockSpawnedProcess.unref).toHaveBeenCalled();
            expect(console.log).toHaveBeenCalledWith('LSP Server process started detached with PID: 7890');
        });

        it('should return null and log error if spawned process has no PID', () => {
             const mockSpawnedProcessNoPid = {
                pid: undefined, // No PID
                unref: jest.fn(),
                on: jest.fn(), stdout: { on: jest.fn() }, stderr: { on: jest.fn() },
            } as unknown as child_process.ChildProcess;
            (childProcessMock.spawn as jest.MockedFunction<typeof child_process.spawn>).mockReturnValue(mockSpawnedProcessNoPid);
            
            // Mock openSync to return distinct file descriptors to check they are closed
            const mockLogFd = 10;
            const mockErrFd = 11;
            (fsMock.openSync as jest.MockedFunction<typeof fs.openSync>).mockImplementation((p) => {
                if (p === lspLogFile) return mockLogFd;
                if (p === lspErrFile) return mockErrFd;
                return 0 as any; // satisfy typing
            });

            const result = launchLspServer(sampleProjectPath, mockProcess);

            expect(result).toBeNull();
            expect(console.error).toHaveBeenCalledWith('Failed to get PID for detached LSP server process.');
            expect(fsMock.writeFileSync).not.toHaveBeenCalledWith(pidFile, expect.any(String), 'utf8');
            expect(fsMock.closeSync).toHaveBeenCalledWith(mockLogFd);
            expect(fsMock.closeSync).toHaveBeenCalledWith(mockErrFd);
        });
        
        it('should return null if spawn itself throws an error', () => {
            (childProcessMock.spawn as jest.MockedFunction<typeof child_process.spawn>).mockImplementation(() => { throw new Error('Spawn failed miserably'); });
            
            const result = launchLspServer(sampleProjectPath, mockProcess);
            
            expect(result).toBeNull();
            expect(console.error).toHaveBeenCalledWith('Exception during LSP server spawn: Spawn failed miserably');
        });

        it('should close log file descriptors after successful spawn and unref', () => {
            const mockLogFd = 10;
            const mockErrFd = 11;
            (fsMock.openSync as jest.MockedFunction<typeof fs.openSync>).mockImplementation((p) => {
                if (p === lspLogFile) return mockLogFd;
                if (p === lspErrFile) return mockErrFd;
                return 0 as any; // satisfy typing
            });
            
            const mockSpawnedProcess = {
                pid: 1234,
                unref: jest.fn(),
                on: jest.fn(), stdout: { on: jest.fn() }, stderr: { on: jest.fn() },
            } as unknown as child_process.ChildProcess;
            (childProcessMock.spawn as jest.MockedFunction<typeof child_process.spawn>).mockReturnValue(mockSpawnedProcess);

            launchLspServer(sampleProjectPath, mockProcess);

            expect(fsMock.closeSync).toHaveBeenCalledWith(mockLogFd);
            expect(fsMock.closeSync).toHaveBeenCalledWith(mockErrFd);
        });
    });
});

// Basic test for the main execution block (if (require.main === module))
// This is harder to test directly without refactoring the script to export the main logic
// or using more complex jest features for module execution.
// For now, we focus on testing the launchLspServer function thoroughly.

// describe('launch-lsp.ts main execution', () => {
//     // TODO: Add tests for main execution block if deemed necessary and feasible
//     // This would involve mocking process.argv, process.exit, and potentially
//     // how require.main === module is evaluated.
// }); 