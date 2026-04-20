import pino, { type Logger as PinoLogger } from "pino";

export interface LoggerOptions {
  level: string;
  pretty: boolean;
}

export class Logger {
  readonly pino: PinoLogger;

  constructor(options: LoggerOptions) {
    this.pino = pino({
      level: options.level,
      ...(options.pretty && {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss",
            ignore: "pid,hostname",
          },
        },
      }),
    });
  }

  info(obj: object | string, msg?: string): void {
    if (typeof obj === "string") {
      this.pino.info(obj);
    } else {
      this.pino.info(obj, msg);
    }
  }

  warn(obj: object | string, msg?: string): void {
    if (typeof obj === "string") {
      this.pino.warn(obj);
    } else {
      this.pino.warn(obj, msg);
    }
  }

  error(obj: object | string, msg?: string): void {
    if (typeof obj === "string") {
      this.pino.error(obj);
    } else {
      this.pino.error(obj, msg);
    }
  }

  debug(obj: object | string, msg?: string): void {
    if (typeof obj === "string") {
      this.pino.debug(obj);
    } else {
      this.pino.debug(obj, msg);
    }
  }
}
