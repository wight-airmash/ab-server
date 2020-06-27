/* eslint-disable @typescript-eslint/no-explicit-any */
import pino from 'pino';
import config from '../config';
import { LOGS_FLUSH_INTERVAL_MS } from '../constants';

type LogLevelMethod = (msgOrObj: any, ...args: any[]) => void;

class Logger {
  private fileLogger: pino.Logger = null;

  private chatFileLogger: pino.Logger = null;

  private consoleLogger: pino.Logger = null;

  private finalHandlers: Function[] = [];

  public debug: LogLevelMethod;

  public info: LogLevelMethod;

  public warn: LogLevelMethod;

  public error: LogLevelMethod;

  public fatal: LogLevelMethod;

  constructor() {
    const { level, path, console: isStdout, chat } = config.logs;
    const isDev = config.env === 'development';

    const loggerConfig = {
      level,
      base: null,
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
        finalLogger.error('error caused exit %o', { error: err.stack });
      }
    };

    if (path.length > 0) {
      if (loggerConfig.prettyPrint) {
        loggerConfig.prettyPrint.colorize = false;
      }

      this.fileLogger = pino(
        loggerConfig,
        isDev ? pino.destination(path) : pino.destination({ dest: path, sync: false })
      );
      this.finalHandlers.push(pino.final(this.fileLogger, finalHandler));
    }

    if (chat.length > 0) {
      if (loggerConfig.prettyPrint) {
        loggerConfig.prettyPrint.colorize = false;
      }

      this.chatFileLogger = pino(
        {
          ...loggerConfig,
          level: 'info',
          nestedKey: 'log',
          messageKey: 'chat',
        },
        isDev ? pino.destination(chat) : pino.destination({ dest: chat, sync: false })
      );
      this.finalHandlers.push(pino.final(this.chatFileLogger, finalHandler));
    }

    if (isStdout) {
      if (loggerConfig.prettyPrint) {
        loggerConfig.prettyPrint.colorize = true;
      }

      this.consoleLogger = pino(
        loggerConfig,
        isDev ? pino.destination() : pino.destination({ sync: false })
      );
      this.finalHandlers.push(pino.final(this.consoleLogger, finalHandler));
    }

    let logHandler: LogLevelMethod = null;

    if (this.fileLogger !== null && this.consoleLogger !== null) {
      logHandler = this.logToFileAndConcole;
    } else if (this.fileLogger !== null && this.consoleLogger === null) {
      logHandler = this.logToFile;
    } else if (this.fileLogger === null && this.consoleLogger !== null) {
      logHandler = this.logToConcole;
    } else {
      // eslint-disable-next-line
      logHandler = (level: string, msgOrObj: any, ...args: any[]): void => {};
    }

    this.debug = logHandler.bind(this, 'debug');
    this.info = logHandler.bind(this, 'info');
    this.warn = logHandler.bind(this, 'warn');
    this.error = logHandler.bind(this, 'error');
    this.fatal = logHandler.bind(this, 'fatal');

    if (path.length > 0) {
      this.debug('Start logging to file %s.', path);
    }

    if (chat.length > 0) {
      this.debug('Start chat logging to file %s.', chat);
    }

    if (isStdout) {
      this.debug('Start logging to console.');
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
  }

  chatPublic(playerId: number, message: string): void {
    if (this.chatFileLogger !== null) {
      this.chatFileLogger.info(
        {
          playerId,
          message,
        },
        'public'
      );
    }
  }

  chatTeam(playerId: number, teamId: number, message: string): void {
    if (this.chatFileLogger !== null) {
      this.chatFileLogger.info(
        {
          playerId,
          teamId,
          message,
        },
        'team'
      );
    }
  }

  chatSay(playerId: number, message: string): void {
    if (this.chatFileLogger !== null) {
      this.chatFileLogger.info(
        {
          playerId,
          message,
        },
        'say'
      );
    }
  }

  private flush(): void {
    if (this.fileLogger !== null) {
      this.fileLogger.flush();
    }

    if (this.consoleLogger !== null) {
      this.consoleLogger.flush();
    }

    if (this.chatFileLogger !== null) {
      this.chatFileLogger.flush();
    }
  }

  private logToFileAndConcole(level: string, msgOrObj: any, ...args: any[]): void {
    this.fileLogger[level](msgOrObj, ...args);
    this.consoleLogger[level](msgOrObj, ...args);
  }

  private logToFile(level: string, msgOrObj: any, ...args: any[]): void {
    this.fileLogger[level](msgOrObj, ...args);
  }

  private logToConcole(level: string, msgOrObj: any, ...args: any[]): void {
    this.consoleLogger[level](msgOrObj, ...args);
  }
}

export default Logger;
