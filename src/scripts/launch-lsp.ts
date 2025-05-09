import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Standard CommonJS __dirname should be available if ts-node compiles to CommonJS
const PID_FILE = path.resolve(__dirname, '..', '..', '.lsp.pid');
const LOG_DIR = path.resolve(__dirname, '..', '..', 'logs');
const LSP_LOG_FILE = path.join(LOG_DIR, 'lsp.log');
const LSP_ERR_FILE = path.join(LOG_DIR, 'lsp.err.log');

const LSP_SERVER_BASE_DIR = path.resolve(__dirname, '..', '..', 'bin', 'eclipse.jdt.ls');
const PLUGINS_DIR = path.join(LSP_SERVER_BASE_DIR, 'plugins');

// Interface for the parts of 'process' we need to inject
interface ProcessLike {
    env: NodeJS.ProcessEnv;
    kill: (pid: number, signal?: string | number) => boolean;
    exit: (code?: number) => never;
    // platform: NodeJS.Platform; // os.platform() is used, not process.platform
}

function findLauncherJar(pluginsDir: string): string | null {
    if (!fs.existsSync(pluginsDir)) {
        console.error(`Error: Plugins directory not found: ${pluginsDir}`);
        console.error('Please ensure the LSP server is installed correctly using "npm run lsp:install".');
        return null;
    }
    const files = fs.readdirSync(pluginsDir);
    const launcherJar = files.find(file => file.startsWith('org.eclipse.equinox.launcher_') && file.endsWith('.jar'));
    return launcherJar ? path.join(pluginsDir, launcherJar) : null;
}

// Modified to throw an error instead of exiting
function getOSSpecificConfigDir(): string {
    const platform = os.platform(); // os.platform() is fine, not from 'process'
    let configDirName = '';
    if (platform === 'win32') {
        configDirName = 'config_win';
    } else if (platform === 'darwin') {
        configDirName = 'config_mac';
    } else {
        configDirName = 'config_linux'; // Default to Linux for other Unix-like systems
    }
    const configPath = path.join(LSP_SERVER_BASE_DIR, configDirName);
    if (!fs.existsSync(configPath)) {
        // Throw an error instead of calling process.exit
        throw new Error(`OS-specific configuration directory not found: ${configPath}. The LSP server installation might be incomplete or corrupted.`);
    }
    return configPath;
}

function launchLspServer(projectPath: string, proc: ProcessLike): child_process.ChildProcess | null {
    const launcherJarPath = findLauncherJar(PLUGINS_DIR);
    if (!launcherJarPath) {
        console.error('Error: Could not find the Eclipse JDT LS launcher JAR.');
        console.error(`Searched in: ${PLUGINS_DIR}`);
        console.error('Ensure the server is installed via "npm run lsp:install" and the bin/eclipse.jdt.ls directory is populated correctly.');
        return null;
    }

    let configDir: string;
    try {
        configDir = getOSSpecificConfigDir();
    } catch (e: unknown) {
        console.error((e as Error).message);
        // proc.exit(1); // Caller (main block) should handle exit based on null return or this script's exit code
        return null; // Indicate failure to the caller
    }

    // Ensure projectPath is absolute, as -data requires an absolute path.
    const absoluteProjectPath = path.resolve(projectPath);
    const workspaceDataDir = path.join(absoluteProjectPath, '.jdt.ls-workspace-data'); // Or a globally managed cache

    if (!fs.existsSync(absoluteProjectPath)) {
        console.error(`Error: Java project path does not exist: ${absoluteProjectPath}`);
        return null;
    }
    if (!fs.statSync(absoluteProjectPath).isDirectory()) {
        console.error(`Error: Java project path is not a directory: ${absoluteProjectPath}`);
        return null;
    }
    
    // Create the workspace data directory if it doesn't exist
    if (!fs.existsSync(workspaceDataDir)) {
        try {
            fs.mkdirSync(workspaceDataDir, { recursive: true });
            console.log(`Created LSP workspace data directory: ${workspaceDataDir}`);
        } catch (e: unknown) {
            console.error(`Error creating LSP workspace data directory ${workspaceDataDir}: ${(e as Error).message}`);
            return null;
        }
    }


    const serverArgs: string[] = [
        '-Declipse.application=org.eclipse.jdt.ls.core.id1',
        '-Dosgi.bundles.defaultStartLevel=4',
        '-Declipse.product=org.eclipse.jdt.ls.core.product',
        '-Dlog.level=ALL', // Or INFO, WARN, ERROR
        '-Xmx1G',
        '--add-modules=ALL-SYSTEM',
        '--add-opens', 'java.base/java.util=ALL-UNNAMED',
        '--add-opens', 'java.base/java.lang=ALL-UNNAMED',
        '-jar', launcherJarPath,
        '-configuration', configDir,
        '-data', workspaceDataDir
    ];

    console.log('Starting Java LSP Server with command:');
    console.log(`java ${serverArgs.join(' ')}`);
    console.log(`LSP Server STDIN/STDOUT will be piped from/to this process.`);

    // Ensure JAVA_HOME is set or java is in PATH - using injected proc.env
    const javaExecutable = proc.env.JAVA_HOME ? path.join(proc.env.JAVA_HOME, 'bin', 'java') : 'java';

    // Print Java version for debugging
    console.log(`Attempting to use Java from: ${javaExecutable}`);
    try {
        child_process.execSync(`${javaExecutable} -version`, { stdio: 'inherit' });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_e) {
        console.error('Failed to get Java version. Ensure Java is correctly installed and in PATH.');
    }

    // Ensure log directory exists
    if (!fs.existsSync(LOG_DIR)) {
        fs.mkdirSync(LOG_DIR, { recursive: true });
        console.log(`Created log directory: ${LOG_DIR}`);
    }

    // Open log files for stdout and stderr using file descriptors
    let logFd: number | undefined;
    let errFd: number | undefined;
    try {
        logFd = fs.openSync(LSP_LOG_FILE, 'a'); // Append mode
        errFd = fs.openSync(LSP_ERR_FILE, 'a'); // Append mode
        console.log(`Redirecting LSP stdout to: ${LSP_LOG_FILE} (fd: ${logFd})`);
        console.log(`Redirecting LSP stderr to: ${LSP_ERR_FILE} (fd: ${errFd})`);
    } catch (e: unknown) {
        console.error(`Error opening log files for redirection: ${(e as Error).message}`);
        return null;
    }

    try {
        // Check if PID file exists and process is potentially running
        if (fs.existsSync(PID_FILE)) {
            const oldPid = parseInt(fs.readFileSync(PID_FILE, 'utf8'), 10);
            if (!isNaN(oldPid)) {
                try {
                    // Check if process exists (0 signal doesn't kill, just checks existence) - using injected proc.kill
                    proc.kill(oldPid, 0);
                    console.warn(`LSP server might already be running with PID ${oldPid} (found in ${PID_FILE}).`);
                    console.warn('If it is stuck, run "npm run lsp:stop" first.');
                    // Optionally exit here, or let spawn fail if port is taken etc.
                    // return null;
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                } catch (_e) {
                    // Process doesn't exist, safe to remove stale PID file
                    console.log(`Removing stale PID file for PID ${oldPid}.`);
                    fs.unlinkSync(PID_FILE);
                }
            }
        }

        console.log('Starting detached Java LSP Server...');
        const lspProcess = child_process.spawn(javaExecutable, serverArgs, {
            stdio: ['ignore', logFd, errFd], // Use file descriptors for stdout/stderr
            detached: true // Allow parent process to exit independently
        });

        // Write the new PID to the file
        if (lspProcess.pid) {
            fs.writeFileSync(PID_FILE, lspProcess.pid.toString(), 'utf8');
            console.log(`LSP Server process started detached with PID: ${lspProcess.pid}`);
            console.log(`PID saved to: ${PID_FILE}`);
        } else {
            console.error('Failed to get PID for detached LSP server process.');
            // Close FDs if we failed to get PID
            if (logFd !== undefined) fs.closeSync(logFd);
            if (errFd !== undefined) fs.closeSync(errFd);
            return null;
        }

        // Close the file descriptors in the parent process, the child owns them now.
        if (logFd !== undefined) fs.closeSync(logFd);
        if (errFd !== undefined) fs.closeSync(errFd);

        // Allow the parent script to exit
        lspProcess.unref();

        // Note: We don't return the lspProcess here anymore as the script should exit.
        // We also don't attach listeners directly as the parent will exit.
        // Monitor the log files for server status.
        return lspProcess; // Still return it for the immediate check in main

    } catch (e: unknown) {
        console.error(`Exception during LSP server spawn: ${(e as Error).message}`);
        return null;
    }
}

if (require.main === module) {
    const projectPathArg = process.argv[2]; // Global process.argv is fine here for script execution
    if (!projectPathArg) {
        console.error('Usage: ts-node src/scripts/launch-lsp.ts <path_to_java_project>');
        console.error('Example: npm run lsp:start -- tests/fixtures/SampleJavaProject');
        process.exit(1); // Global process.exit is fine here for script execution
    }
    console.log(`Target Java project path: ${projectPathArg}`);
    
    // Pass the global process object when running as a script
    const lsp = launchLspServer(projectPathArg, process);
    
    if (lsp) {
        // Since it's detached, we don't keep this script running.
        // We just confirm it was launched.
        console.log("launch-lsp.ts: Successfully launched detached LSP server.");
        console.log(`Monitor logs in ${LOG_DIR}`);
        // Exiting the script cleanly - global process.exit is fine here
        process.exit(0);
    } else {
        console.error("Failed to launch LSP server.");
        // Global process.exit is fine here for script execution
        process.exit(1);
    }
}

export { launchLspServer, ProcessLike }; // Export ProcessLike for testing if needed 