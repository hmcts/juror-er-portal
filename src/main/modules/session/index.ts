import secretsConfig from 'config';
import * as express from 'express';

const expressSession = require('express-session');

export class SessionConfig {
  private _sessionExpires: number;

  constructor() {
    this._sessionExpires = 10 * (60 * 60);
  }

  public start(app: express.Express): void {
    const secret: string = secretsConfig.get('secrets.juror.er-portal-sessionSecret');
    const config = this._config(secret);
    app.use(expressSession(config));
  }

  private _config(secret: string) {
    const isProduction = process.env.NODE_ENV === 'production';
    return {
      secret,
      resave: false,
      saveUninitialized: false,
      maxAge: this._sessionExpires,
      name: 'juror_er_portal_session',
      cookie: {
        secure: isProduction,
        sameSite: 'lax' as const, // oauth redirect does not work with strict
        httpOnly: true,
      },
    };
  }
}
