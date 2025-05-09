import * as fs from 'fs';
import * as child_process from 'child_process';
import * as os from 'os';
import * as path from 'path';
import { launchLspServer, ProcessLike } from './launch-lsp';

// Mock the modules
jest.mock('fs');
jest.mock('child_process');
jest.mock('os');
jest.mock('path');

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedChildProcess = child_process as jest.Mocked<typeof child_process>;
const mockedOs = os as jest.Mocked<typeof os>;
const mockedPath = path as jest.Mocked<typeof path>;

describe('launch-lsp script', () => {
  const MOCK_SCRIPT_DIR = '/mock/project/src/scripts';
  const MOCK_LSP_BASE_DIR = '/mock/project/bin/eclipse.jdt.ls';
  const MOCK_PLUGINS_DIR = '/mock/project/bin/eclipse.jdt.ls/plugins';
  const MOCK_LAUNCHER_JAR_NAME = 'org.eclipse.equinox.launcher_1.2.3.jar';
  const MOCK_LAUNCHER_JAR_PATH = `${MOCK_PLUGINS_DIR}/${MOCK_LAUNCHER_JAR_NAME}`;
  const MOCK_CONFIG_MAC_DIR = `${MOCK_LSP_BASE_DIR}/config_mac`;
  const MOCK_CONFIG_WIN_DIR = `${MOCK_LSP_BASE_DIR}/config_win`;
  const MOCK_CONFIG_LINUX_DIR = `${MOCK_LSP_BASE_DIR}/config_linux`;
  const MOCK_PROJECT_PATH = '/mock/test-java-project';
  const MOCK_ABSOLUTE_PROJECT_PATH = '/mock/test-java-project'; 
  const MOCK_WORKSPACE_DATA_DIR = `${MOCK_ABSOLUTE_PROJECT_PATH}/.jdt.ls-workspace-data`;
  const MOCK_PID_FILE = '/mock/project/.lsp.pid';
  const MOCK_LOG_DIR = '/mock/project/logs';
  const MOCK_LSP_LOG_FILE = `${MOCK_LOG_DIR}/lsp.log`;
  const MOCK_LSP_ERR_FILE = `${MOCK_LOG_DIR}/lsp.err.log`;

  let mockProcess: jest.Mocked<ProcessLike>;

  beforeEach(() => {
    jest.resetAllMocks();

    mockProcess = {
      env: { ...process.env }, // Start with a copy of actual env, can override specific vars
      kill: jest.fn<(pid: number, signal?: string | number) => boolean>(),
      exit: jest.fn().mockImplementation((code?: number) => { throw new Error(`process.exit called with ${code}`); }) as jest.MockedFunction<never>,
    };

    mockedPath.resolve.mockImplementation((...args: string[]) => {
      if (args[0] === __dirname && args.slice(1).join('/') === '../../.lsp.pid') return MOCK_PID_FILE;
      if (args[0] === __dirname && args.slice(1).join('/') === '../../logs') return MOCK_LOG_DIR;
      if (args[0] === __dirname && args.slice(1).join('/') === '../../bin/eclipse.jdt.ls') return MOCK_LSP_BASE_DIR;
      if (args.length === 1 && args[0] === MOCK_PROJECT_PATH) return MOCK_ABSOLUTE_PROJECT_PATH;
      // Fallback for other path.resolve calls if needed, this simplistic one might not cover all cases.
      return path.posix.resolve(...args); 
    });

    mockedPath.join.mockImplementation((...args: string[]) => {
      if (args[0] === MOCK_LOG_DIR && args[1] === 'lsp.log') return MOCK_LSP_LOG_FILE;
      if (args[0] === MOCK_LOG_DIR && args[1] === 'lsp.err.log') return MOCK_LSP_ERR_FILE;
      if (args[0] === MOCK_LSP_BASE_DIR && args[1] === 'plugins') return MOCK_PLUGINS_DIR;
      if (args[0] === MOCK_PLUGINS_DIR && args[1] === MOCK_LAUNCHER_JAR_NAME) return MOCK_LAUNCHER_JAR_PATH;
      if (args[0] === MOCK_LSP_BASE_DIR && args[1] === 'config_mac') return MOCK_CONFIG_MAC_DIR;
      if (args[0] === MOCK_LSP_BASE_DIR && args[1] === 'config_win') return MOCK_CONFIG_WIN_DIR;
      if (args[0] === MOCK_LSP_BASE_DIR && args[1] === 'config_linux') return MOCK_CONFIG_LINUX_DIR;
      if (args[0] === MOCK_ABSOLUTE_PROJECT_PATH && args[1] === '.jdt.ls-workspace-data') return MOCK_WORKSPACE_DATA_DIR;
      if (mockProcess.env.JAVA_HOME && args[0] === mockProcess.env.JAVA_HOME && args[1] === 'bin' && args[2] === 'java') {
        return `${mockProcess.env.JAVA_HOME}/bin/java`;
      }
      return path.posix.join(...args); 
    });
    
    mockedOs.platform.mockReturnValue('darwin'); 
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.statSync.mockReturnValue({ isDirectory: () => true } as fs.Stats);
    mockedFs.openSync.mockReturnValueOnce(10).mockReturnValueOnce(11);

    const mockSpawnProcess = {
        pid: 12345,
        unref: jest.fn(),
        on: jest.fn(),
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
    } as any; 
    mockedChildProcess.spawn.mockReturnValue(mockSpawnProcess);
    
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('launchLspServer', () => {
    test('should successfully launch the LSP server', () => {
      mockedFs.existsSync.mockImplementation(p => {
        if (p === MOCK_PLUGINS_DIR) return true;
        if (p === MOCK_LAUNCHER_JAR_PATH) return true; 
        if (p === MOCK_CONFIG_MAC_DIR) return true;
        if (p === MOCK_ABSOLUTE_PROJECT_PATH) return true;
        if (p === MOCK_WORKSPACE_DATA_DIR) return false; 
        if (p === MOCK_LOG_DIR) return false; 
        if (p === MOCK_PID_FILE) return false; 
        return false;
      });
      mockedFs.readdirSync.mockReturnValue([MOCK_LAUNCHER_JAR_NAME] as any);

      const lspProcess = launchLspServer(MOCK_PROJECT_PATH, mockProcess);

      expect(mockedPath.resolve).toHaveBeenCalledWith(MOCK_PROJECT_PATH);
      expect(mockedFs.existsSync).toHaveBeenCalledWith(MOCK_PLUGINS_DIR);
      expect(mockedFs.readdirSync).toHaveBeenCalledWith(MOCK_PLUGINS_DIR);
      expect(mockedFs.existsSync).toHaveBeenCalledWith(MOCK_CONFIG_MAC_DIR); 
      expect(mockedFs.existsSync).toHaveBeenCalledWith(MOCK_ABSOLUTE_PROJECT_PATH);
      expect(mockedFs.statSync).toHaveBeenCalledWith(MOCK_ABSOLUTE_PROJECT_PATH);
      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(MOCK_WORKSPACE_DATA_DIR, { recursive: true });
      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(MOCK_LOG_DIR, { recursive: true });
      expect(mockedFs.openSync).toHaveBeenCalledWith(MOCK_LSP_LOG_FILE, 'a');
      expect(mockedFs.openSync).toHaveBeenCalledWith(MOCK_LSP_ERR_FILE, 'a');
      expect(child_process.spawn).toHaveBeenCalledWith(
        'java',
        expect.arrayContaining([
          '-jar', MOCK_LAUNCHER_JAR_PATH,
          '-configuration', MOCK_CONFIG_MAC_DIR,
          '-data', MOCK_WORKSPACE_DATA_DIR
        ]),
        { stdio: ['ignore', 10, 11], detached: true }
      );
      expect(fs.writeFileSync).toHaveBeenCalledWith(MOCK_PID_FILE, '12345', 'utf8');
      expect(lspProcess?.pid).toBe(12345);
      expect(lspProcess?.unref).toHaveBeenCalled();
      expect(fs.closeSync).toHaveBeenCalledWith(10);
      expect(fs.closeSync).toHaveBeenCalledWith(11);
      expect(mockProcess.exit).not.toHaveBeenCalled();
    });

    test('should return null if OS-specific config directory does not exist', () => {
        mockedOs.platform.mockReturnValue('darwin');
        mockedFs.existsSync.mockImplementation(p => {
            if (p === MOCK_PLUGINS_DIR) return true;
            if (p === MOCK_CONFIG_MAC_DIR) return false; // Config dir does NOT exist
            return true; 
        });
        mockedFs.readdirSync.mockReturnValue([MOCK_LAUNCHER_JAR_NAME] as any);

        const result = launchLspServer(MOCK_PROJECT_PATH, mockProcess);
        
        expect(result).toBeNull();
        expect(console.error).toHaveBeenCalledWith(expect.stringContaining('OS-specific configuration directory not found'));
        expect(console.error).toHaveBeenCalledWith(expect.stringContaining(MOCK_CONFIG_MAC_DIR));
        expect(mockProcess.exit).not.toHaveBeenCalled(); // launchLspServer itself should not call exit
    });

    test('should handle existing PID file with a running process', () => {
        mockedFs.existsSync.mockImplementation(p => 
            p === MOCK_PID_FILE || 
            p === MOCK_PLUGINS_DIR || 
            p === MOCK_CONFIG_MAC_DIR || 
            p === MOCK_ABSOLUTE_PROJECT_PATH
        );
        mockedFs.readdirSync.mockReturnValue([MOCK_LAUNCHER_JAR_NAME] as any);
        mockedFs.readFileSync.mockReturnValue('67890', 'utf8'); 
        mockProcess.kill.mockReturnValue(true);

        launchLspServer(MOCK_PROJECT_PATH, mockProcess);
        expect(mockProcess.kill).toHaveBeenCalledWith(67890, 0);
        expect(console.warn).toHaveBeenCalledWith(`LSP server might already be running with PID 67890 (found in ${MOCK_PID_FILE}).`);
        expect(child_process.spawn).toHaveBeenCalled();
        expect(mockProcess.exit).not.toHaveBeenCalled();
    });

    test('should remove stale PID file if process is not running', () => {
        mockedFs.existsSync.mockImplementation(p => 
            p === MOCK_PID_FILE || 
            p === MOCK_PLUGINS_DIR || 
            p === MOCK_CONFIG_MAC_DIR || 
            p === MOCK_ABSOLUTE_PROJECT_PATH
        );
        mockedFs.readdirSync.mockReturnValue([MOCK_LAUNCHER_JAR_NAME] as any);
        mockedFs.readFileSync.mockReturnValue('67890', 'utf8');
        mockProcess.kill.mockImplementationOnce(() => { throw new Error('ESRCH'); });

        launchLspServer(MOCK_PROJECT_PATH, mockProcess);
        expect(mockProcess.kill).toHaveBeenCalledWith(67890, 0);
        expect(fs.unlinkSync).toHaveBeenCalledWith(MOCK_PID_FILE);
        expect(console.log).toHaveBeenCalledWith(`Removing stale PID file for PID 67890.`);
        expect(child_process.spawn).toHaveBeenCalled();
        expect(mockProcess.exit).not.toHaveBeenCalled();
    });
    
    test('should use JAVA_HOME from injected process.env for java executable if set', () => {
        mockProcess.env.JAVA_HOME = '/mock/java_home';
        mockedFs.existsSync.mockReturnValue(true);
        mockedFs.readdirSync.mockReturnValue([MOCK_LAUNCHER_JAR_NAME] as any);
        
        launchLspServer(MOCK_PROJECT_PATH, mockProcess);

        expect(child_process.spawn).toHaveBeenCalledWith(
            `${mockProcess.env.JAVA_HOME}/bin/java`,
            expect.any(Array),
            expect.any(Object)
        );
        // Note: No need to delete mockProcess.env.JAVA_HOME as mockProcess is reset in beforeEach
    });
    
    // ... (other tests for missing launcher jar, project path issues remain largely the same, just pass mockProcess)

    test('should return null and log error if launcher JAR is not found', () => {
      mockedFs.existsSync.mockReturnValueOnce(true); 
      mockedFs.readdirSync.mockReturnValue([]); 
      const result = launchLspServer(MOCK_PROJECT_PATH, mockProcess);
      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith('Error: Could not find the Eclipse JDT LS launcher JAR.');
      expect(mockProcess.exit).not.toHaveBeenCalled();
    });

    test('should return null if plugins directory does not exist', () => {
        mockedFs.existsSync.mockImplementation(p => p !== MOCK_PLUGINS_DIR);
        const result = launchLspServer(MOCK_PROJECT_PATH, mockProcess);
        expect(result).toBeNull();
        expect(console.error).toHaveBeenCalledWith(`Error: Plugins directory not found: ${MOCK_PLUGINS_DIR}`);
        expect(mockProcess.exit).not.toHaveBeenCalled();
    });

    test('should return null if project path does not exist', () => {
        mockedFs.existsSync.mockImplementation(p => {
            if (p === MOCK_ABSOLUTE_PROJECT_PATH) return false; 
            return true; 
        });
        mockedFs.readdirSync.mockReturnValue([MOCK_LAUNCHER_JAR_NAME] as any);
        const result = launchLspServer(MOCK_PROJECT_PATH, mockProcess);
        expect(result).toBeNull();
        expect(console.error).toHaveBeenCalledWith(`Error: Java project path does not exist: ${MOCK_ABSOLUTE_PROJECT_PATH}`);
        expect(mockProcess.exit).not.toHaveBeenCalled();
    });

    test('should return null if project path is not a directory', () => {
        mockedFs.existsSync.mockReturnValue(true); 
        mockedFs.statSync.mockReturnValue({ isDirectory: () => false } as fs.Stats); 
        mockedFs.readdirSync.mockReturnValue([MOCK_LAUNCHER_JAR_NAME] as any);
        const result = launchLspServer(MOCK_PROJECT_PATH, mockProcess);
        expect(result).toBeNull();
        expect(console.error).toHaveBeenCalledWith(`Error: Java project path is not a directory: ${MOCK_ABSOLUTE_PROJECT_PATH}`);
        expect(mockProcess.exit).not.toHaveBeenCalled();
    });

    test('should correctly determine config_win on windows', () => {
        mockedOs.platform.mockReturnValue('win32');
        mockedFs.existsSync.mockReturnValue(true);
        mockedFs.readdirSync.mockReturnValue([MOCK_LAUNCHER_JAR_NAME] as any);

        launchLspServer(MOCK_PROJECT_PATH, mockProcess);
        expect(child_process.spawn).toHaveBeenCalledWith(
            'java',
            expect.arrayContaining(['-configuration', MOCK_CONFIG_WIN_DIR]),
            expect.any(Object)
        );
    });

    test('should correctly determine config_linux on linux', () => {
        mockedOs.platform.mockReturnValue('linux');
        mockedFs.existsSync.mockReturnValue(true);
        mockedFs.readdirSync.mockReturnValue([MOCK_LAUNCHER_JAR_NAME] as any);

        launchLspServer(MOCK_PROJECT_PATH, mockProcess);
        expect(child_process.spawn).toHaveBeenCalledWith(
            'java',
            expect.arrayContaining(['-configuration', MOCK_CONFIG_LINUX_DIR]),
            expect.any(Object)
        );
    });

  });
}); 