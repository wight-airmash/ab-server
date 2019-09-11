/* eslint-disable @typescript-eslint/no-explicit-any */
import pino from 'pino';
import { LOGS_FLUSH_INTERVAL_MS } from '@/constants';
import config from '@/config';

interface LoggerConfig {
  /**
   * Log level.
   */
  level: string;

  /**
   * Log directory or file path.
   */
  path: string;

  /**
   * Log to console.
   */
  isStdout: boolean;
}

class Logger {
  protected fileLogger: null | pino.Logger;

  protected consoleLogger: null | pino.Logger;

  protected finalHandlers: Function[] = [];

  constructor({ level, path, isStdout }: LoggerConfig) {
    this.consoleLogger = null;
    this.fileLogger = null;

    const isDev = config.env === 'development';

    const loggerConfig = {
      level,
      base: null,
      redact: {
        paths: ['session'],
        censor: '[private]',
      },
      prettyPrint: {
        colorize: true,
        translateTime: true,
      },
    };

    if (!isDev) {
      delete loggerConfig.prettyPrint;
    }

    const finalHandler = (err: Error | null, finalLogger: pino.Logger, evt: string): void => {
      finalLogger.info(`${evt} caught`);

      if (err) {
        finalLogger.error(err, 'error caused exit');
      }
    };

    if (path.length > 0) {
      if (loggerConfig.prettyPrint) {
        loggerConfig.prettyPrint.colorize = false;
      }

      this.fileLogger = pino(loggerConfig, isDev ? pino.destination(path) : pino.extreme(path));
      this.finalHandlers.push(pino.final(this.fileLogger, finalHandler));
    }

    if (isStdout) {
      if (loggerConfig.prettyPrint) {
        loggerConfig.prettyPrint.colorize = true;
      }

      this.consoleLogger = pino(loggerConfig, isDev ? pino.destination() : pino.extreme());
      this.finalHandlers.push(pino.final(this.consoleLogger, finalHandler));
    }

    if (path.length > 0) {
      this.debug('Start logging to file.');
    }

    if (isStdout) {
      this.consoleLogger.debug('Start logging to console.');
    }

    setInterval((): void => {
      this.flush();
    }, LOGS_FLUSH_INTERVAL_MS).unref();

    this.debug('Logger is ready.');
  }

  processfinalHandlers(err: Error | null, msg: string): void {
    this.finalHandlers.forEach(handler => {
      handler(err, msg);
    });

    process.exit(Error ? 1 : 0);
  }

  protected flush(): void {
    if (this.fileLogger !== null) {
      this.fileLogger.flush();
    }

    if (this.consoleLogger !== null) {
      this.consoleLogger.flush();
    }
  }

  protected log(level: string, msgOrObj: any, ...args: any[]): void {
    if (this.fileLogger !== null) {
      this.fileLogger[level](msgOrObj, ...args);
    }

    if (this.consoleLogger !== null) {
      this.consoleLogger[level](msgOrObj, ...args);
    }
  }

  debug(msgOrObj: any, ...args: any[]): void {
    this.log('debug', msgOrObj, ...args);
  }

  info(msgOrObj: any, ...args: any[]): void {
    this.log('info', msgOrObj, ...args);
  }

  warn(msgOrObj: any, ...args: any[]): void {
    this.log('warn', msgOrObj, ...args);
  }

  error(msgOrObj: any, ...args: any[]): void {
    this.log('error', msgOrObj, ...args);
  }

  fatal(msgOrObj: any, ...args: any[]): void {
    this.log('fatal', msgOrObj, ...args);
  }
}

export default Logger;
