import { traceError, traceInfo, traceLog, traceWarn } from '../log/logging';
import { spawn } from 'child_process';

export const ensureWaldiezPy = (executable: string | undefined) => {
    return new Promise<void>((resolve, reject) => {
        if (!executable) {
            traceError('Python extension not found');
            reject();
            return;
        }
        const check = spawn(executable, ['-m', 'waldiez', '--version']);
        check.on('exit', code => {
            if (code === 0) {
                resolve();
            } else {
                if (!executable) {
                    traceError('Python extension not found');
                    reject();
                    return;
                }
                const install = spawn(executable, [
                    '-m',
                    'pip',
                    'install',
                    'waldiez'
                ]);
                install.stdout.on('data', data => {
                    traceLog(data);
                });
                install.stderr.on('data', data => {
                    const dataString = data.toString();
                    if (dataString.startsWith('WARNING')) {
                        traceWarn(dataString);
                        return;
                    }
                    if (dataString.startsWith('ERROR')) {
                        traceError(dataString);
                        return;
                    }
                    if (dataString.startsWith('INFO')) {
                        traceInfo(dataString);
                    }
                    traceError(dataString);
                });
                install.on('exit', code => {
                    if (code === 0) {
                        resolve();
                    } else {
                        reject();
                    }
                });
            }
        });
    });
};
