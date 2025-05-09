import * as fs from 'fs';
import * as path from 'path';

// Standard CommonJS __dirname should be available
const PID_FILE = path.resolve(__dirname, '..', '..', '.lsp.pid');

function stopLspServer() {
    if (!fs.existsSync(PID_FILE)) {
        console.log('LSP server does not appear to be running (PID file not found).');
        return;
    }

    let pid: number | undefined;
    try {
        const pidStr = fs.readFileSync(PID_FILE, 'utf8');
        pid = parseInt(pidStr, 10);
        if (isNaN(pid)) {
            console.error(`Error: Invalid PID found in ${PID_FILE}: ${pidStr}`);
            // Optionally remove the invalid file
            // fs.unlinkSync(PID_FILE);
            return;
        }
    } catch (e: unknown) {
        console.error(`Error reading PID file ${PID_FILE}: ${(e as Error).message}`);
        return;
    }

    console.log(`Attempting to stop LSP server process with PID: ${pid}...`);

    try {
        // Send SIGTERM signal (graceful shutdown)
        process.kill(pid, 'SIGTERM');
        console.log(`Sent SIGTERM to process ${pid}. Check logs or process list to confirm shutdown.`);
        
        // Attempt to remove the PID file after sending the signal
        // It's possible the process hasn't fully exited yet, but this is generally safe
        try {
            fs.unlinkSync(PID_FILE);
            console.log(`Removed PID file: ${PID_FILE}`);
        } catch (unlinkErr: unknown) {
            console.warn(`Could not remove PID file ${PID_FILE}: ${(unlinkErr as Error).message}`);
        }

    } catch (e: unknown) {
        const err = e as { code?: string; message: string }; // More specific assertion
        if (err.code === 'ESRCH') {
            console.log(`Process with PID ${pid} not found. It might have already stopped.`);
            // Clean up the stale PID file
            try {
                 fs.unlinkSync(PID_FILE);
                 console.log(`Removed stale PID file: ${PID_FILE}`);
             } catch (unlinkErr: unknown) {
                 console.warn(`Could not remove stale PID file ${PID_FILE}: ${(unlinkErr as Error).message}`);
            }
        } else {
            console.error(`Error sending signal to process ${pid}: ${err.message}`);
            console.error('You may need to manually kill the process.');
        }
    }
}

if (require.main === module) {
    stopLspServer();
}

export { stopLspServer }; 