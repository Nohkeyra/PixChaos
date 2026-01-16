
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type LogType = 'log' | 'warn' | 'error' | 'info';

export interface LogEntry {
  id: string;
  timestamp: number;
  type: LogType;
  message: string;
  data?: any[];
}

class DebugService {
  private logs: LogEntry[] = [];
  private listeners: ((logs: LogEntry[]) => void)[] = [];
  private originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
  };
  private isInitialized = false;

  public init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    const createInterceptor = (type: LogType) => {
        return (...args: any[]) => {
            // Call original first to ensure devtools still work
            this.originalConsole[type](...args);
            this.addLog(type, args);
        };
    };

    console.log = createInterceptor('log');
    console.warn = createInterceptor('warn');
    console.error = createInterceptor('error');
    console.info = createInterceptor('info');

    window.addEventListener('error', (event) => {
      this.addLog('error', [event.message, `at ${event.filename}:${event.lineno}`]);
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.addLog('error', ['Unhandled Promise Rejection:', event.reason]);
    });
  }

  private addLog(type: LogType, args: any[]) {
    try {
        const message = args.map(arg => {
            if (arg instanceof Error) return `${arg.message}\n${arg.stack}`;
            if (typeof arg === 'object') {
                try {
                    return JSON.stringify(arg, null, 2);
                } catch (e) {
                    return '[Circular/Unserializable Object]';
                }
            }
            return String(arg);
        }).join(' ');

        const entry: LogEntry = {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: Date.now(),
            type,
            message,
            data: args
        };

        // Keep last 500 logs to prevent memory issues
        this.logs = [entry, ...this.logs].slice(0, 500); 
        this.notifyListeners();
    } catch (e) {
        // Prevent infinite loops if logging itself fails
        this.originalConsole.error('Internal DebugService Error:', e);
    }
  }

  private notifyListeners() {
    this.listeners.forEach(l => l(this.logs));
  }

  public getLogs() {
    return this.logs;
  }

  public clear() {
    this.logs = [];
    this.notifyListeners();
  }

  public subscribe(listener: (logs: LogEntry[]) => void) {
    this.listeners.push(listener);
    listener(this.logs); // Immediate callback with current logs
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
}

export const debugService = new DebugService();
