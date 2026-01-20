import secretsConfig from 'config';
import { RedisStore } from 'connect-redis';
import * as express from 'express';
import session, { SessionOptions } from 'express-session';
import { RedisClientType, createClient } from 'redis';

import { Logger } from '../logger';

export class SessionConfig {
  private _sessionExpires: number = 10 * 60 * 60; // seconds
  private _redisClient?: RedisClientType;

  public start(app: express.Express): void {
    const secret: string = secretsConfig.get('secrets.juror.er-portal-sessionSecret');

    const redisConnectionString = this._getRedisConnectionString();

    const config = this._config(secret);

    if (redisConnectionString) {
      this.redisClient();
      config.store = this.redisStore();
    }

    app.use(session(config));
  }

  private redisClient() {
    this._redisClient = createClient({
      url: secretsConfig.get('secrets.juror.er-portal-redisConnection'),
      pingInterval: 5000,
      socket: {
        keepAlive: true,
      },
    });

    this._redisClient.connect().catch((error: unknown) => {
      Logger.instance.error('Error connecting redis client: ', error);
    });

    this._redisClient.on('error', (err: unknown) => {
      Logger.instance.error(`Could not connect to redis: ${String(err)}`);
    });
    this._redisClient.on('connect', () => {
      Logger.instance.info('Connected to redis successfully');
    });
  }

  private redisStore() {
    return new RedisStore({
      client: this._redisClient,
      prefix: 'JurorERPortal:',
    });
  }

  private _getRedisConnectionString() {
    let redisConnectionString;

    try {
      redisConnectionString = secretsConfig.get('secrets.juror.er-portal-redisConnection');
      return redisConnectionString;
    } catch (err) {
      Logger.instance.warn('Redis connection string is not available... setting in memory sessions');
      return;
    }
  }

  private _config(secret: string): SessionOptions {
    const isProduction = process.env.NODE_ENV === 'production';
    return {
      secret,
      resave: false,
      saveUninitialized: false,
      name: 'juror_er_portal_session',
      cookie: {
        secure: isProduction,
        sameSite: 'lax' as const, // oauth redirect does not work with strict
        httpOnly: true,
        maxAge: this._sessionExpires * 1000,
      },
    };
  }
}
