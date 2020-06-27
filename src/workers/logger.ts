import { parentPort } from 'worker_threads';
import {
  WORKERS_LOG_DEBUG,
  WORKERS_LOG_ERROR,
  WORKERS_LOG_INFO,
  WORKERS_LOG_WARN,
} from '../events';

export default class WorkerLogger {
  static debug(...args: any[]): void {
    parentPort.postMessage({
      event: WORKERS_LOG_DEBUG,
      args,
    });
  }

  static info(...args: any[]): void {
    parentPort.postMessage({
      event: WORKERS_LOG_INFO,
      args,
    });
  }

  static warn(...args: any[]): void {
    parentPort.postMessage({
      event: WORKERS_LOG_WARN,
      args,
    });
  }

  static error(...args: any[]): void {
    parentPort.postMessage({
      event: WORKERS_LOG_ERROR,
      args,
    });
  }
}
