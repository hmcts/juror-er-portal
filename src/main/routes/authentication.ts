import config from 'config';
import { Application } from 'express';
import * as Express from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';

import { authDAO } from '../objects/login';

export default function (app: Application): void {
  app.post('/dev-login', async (req, res) => {
    if (!req.body?.email) {
      app.logger.warn('No email provided for dev login');
      req.session.errors = { email: 'Please enter an email address' };
      return res.redirect('/');
    }

    try {
      await doLogin(app)(req, res, { email: req.body.email });
      return res.redirect('/data-upload');
    } catch (err) {
      app.logger.crit('Error while logging in using developer email field', { error: err });
      req.session.formFields = { email: req.body.email };
      req.session.errors = { email: 'Unable to sign in with the provided email address' };
      return res.redirect('/');
    }
  });
}

const doLogin =
  (app: Application) =>
  async (req: Express.Request, res: Express.Response, body: Record<string, string>): Promise<void> => {
    const jwtResponse = await authDAO.post(app, body);
    req.session.authKey = config.get('secrets.juror.er-portal-jwtKey');
    req.session.authToken = jwtResponse.jwt;

    if (req.session.authToken) {
      req.session.authentication = jwt.decode(req.session.authToken) as JwtPayload;
    }

    app.logger.info('User logged in', {
      auth: req.session.authentication,
      data: { body },
    });
  };
