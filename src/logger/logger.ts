/* eslint-disable @typescript-eslint/no-explicit-any */
import {pino, symbols} from 'pino';
import config from '../config';
import { LOGS_FLUSH_INTERVAL_MS } from '../constants';

// https://github.com/pinojs/pino/blob/v6.x/lib/tools.js
(pino as any).final = function(logger, handler) {
  if (typeof logger === 'undefined' || typeof logger.child !== 'function') {
    throw Error('expected a pino logger instance')
  }
  const hasHandler = (typeof handler !== 'undefined')
  if (hasHandler && typeof handler !== 'function') {
    throw Error('if supplied, the handler parameter should be a function')
  }
  const stream = logger[symbols.streamSym]
  if (typeof stream.flushSync !== 'function') {
    throw Error('final requires a stream that has a flushSync method, such as pino.destination')
  }

  const finalLogger = new Proxy(logger, {
    get: (logger, key) => {
      if (key in logger.levels.values) {
        return (...args) => {
          logger[key](...args)
          stream.flushSync()
        }
      }
      return logger[key]
    }
  })

  if (!hasHandler) {
    return finalLogger
  }

  return (err = null, ...args) => {
    try {
      stream.flushSync()
    } catch (e) {
      // it's too late to wait for the stream to be ready
      // because this is a final tick scenario.
      // in practice there shouldn't be a situation where it isn't
      // however, swallow the error just in case (and for easier testing)
    }
    return handler(err, finalLogger, ...args)
  }
}

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

    //if (!isDev) {
      delete loggerConfig.prettyPrint;
    //}

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
      this.finalHandlers.push((pino as any).final(this.fileLogger, finalHandler));
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
      this.finalHandlers.push((pino as any).final(this.chatFileLogger, finalHandler));
    }

    if (isStdout) {
      if (loggerConfig.prettyPrint) {
        loggerConfig.prettyPrint.colorize = true;
      }

      this.consoleLogger = pino(
        loggerConfig,
        isDev ? pino.destination() : pino.destination({ sync: false })
      );
      this.finalHandlers.push((pino as any).final(this.consoleLogger, finalHandler));
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
