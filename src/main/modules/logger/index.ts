import * as express from 'express';
import fse from 'fs-extra';
import winston from 'winston';

interface LoggerConfig {
  logConsole?: string;
  logPath: string;
}

const customColors = {
  trace: 'white',
  debug: 'green',
  info: 'green',
  warn: 'yellow',
  crit: 'red',
  fatal: 'red',
};
const levels = {
  fatal: 0,
  crit: 1,
  warn: 2,
  info: 3,
  debug: 4,
  trace: 5,
};

const checkDirectoryCreate = (dir: string) => {
  try {
    fse.ensureDirSync(dir);
    return true;
  } catch (exception) {
    return false;
  }
};

export class Logger {
  config: LoggerConfig;
  transports: winston.transport[];
  static instance: winston.Logger;
  constructor(config: LoggerConfig) {
    this.config = config;
    this.transports = [];
  }

  initLogger(app: express.Express): void {
    // Add custom colors
    winston.addColors(customColors);
    // Setup the actual logger
    Logger.instance = winston.createLogger({
      levels,
      transports: this.transports.length
        ? this.transports
        : [
            new winston.transports.Console({
              level: this.config.logConsole || 'info',
              format: winston.format.combine(
                winston.format.colorize(),
                winston.format.timestamp(),
                winston.format.printf(({ timestamp, level, message, ...meta }) => {
                  const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
                  return `${timestamp} ${level}: ${message} ${metaString}`;
                })
              ),
            }),
          ],
    });

    // Ensure log directory exists
    checkDirectoryCreate(this.config.logPath);

    if (app) {
      // attach to the app object
      app.logger = Logger.instance;
    }
  }
}
