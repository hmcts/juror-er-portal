import * as express from 'express';
import winston from 'winston';

// Extend Express namespace to add 'logger' property
declare global {
  namespace Express {
    interface Application {
      logger: winston.Logger;
    }
    interface Request {
      decoded?: any;
    }
  }
}
