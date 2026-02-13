
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

export async function parseHwp(buffer: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
        // 1. Write buffer to temp file
        const tempDir = os.tmpdir();
        const tempFilePath = path.join(tempDir, `temp_${Date.now()}.hwp`);

        fs.writeFileSync(tempFilePath, buffer);

        // 2. Spawn Python process
        // Assumes 'python' is in PATH. If 'python3' is needed, change command.
        // Script path: we need absolute path to scripts/parse_hwp.py
        // Assuming this code runs in project root or we can find it relative to cwd.
        const scriptPath = path.resolve(process.cwd(), 'scripts', 'parse_hwp.py');

        const pythonProcess = spawn('python', [scriptPath, tempFilePath]);

        let dataString = '';
        let errorString = '';

        pythonProcess.stdout.on('data', (data) => {
            dataString += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            errorString += data.toString();
        });

        pythonProcess.on('close', (code) => {
            // 3. Cleanup temp file
            try {
                if (fs.existsSync(tempFilePath)) {
                    fs.unlinkSync(tempFilePath);
                }
            } catch (e) {
                console.error("Failed to delete temp file:", e);
            }

            if (code !== 0) {
                // If script printed "ERROR: ...", capture it
                if (dataString.startsWith("ERROR:")) {
                    reject(new Error(dataString));
                } else {
                    reject(new Error(`Python script exited with code ${code}: ${errorString}`));
                }
            } else {
                if (dataString.startsWith("ERROR:")) {
                    reject(new Error(dataString));
                } else {
                    resolve(dataString);
                }
            }
        });
    });
}
