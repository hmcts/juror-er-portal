import config from 'config';
import { Application } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import _ from 'lodash';

import { authDAO } from '../objects/login';

export default function (app: Application): void {
  app.get('/', (req, res) => {
    delete req.session.user;
    delete req.session.authKey;
    delete req.session.authToken;
    delete req.session.authentication;

    const tmpErrors = _.clone(req.session.errors);
    const tmpBody = _.clone(req.session.formFields);
    delete req.session.errors;
    delete req.session.formFields;
    
    res.render('login', {
      devLoginUrl: '/dev-login',
      tmpBody,
      errors: tmpErrors,
    });
  });

  app.post('/dev-login', async (req, res) => {
    if (!req.body?.email) {
      app.logger.warn('No email provided for dev login');
      req.session.errors = { email: 'Please enter an email address' };
      return res.redirect('/');
    }

    try {
      await doLogin(req)(app, { email: req.body.email });
      return res.redirect('/data-upload');
    } catch (err) {
      app.logger.crit('Error while logging in using developer email field', { error: err });
      req.session.formFields = { email: req.body.email };
      req.session.errors = { email: 'Unable to sign in with the provided email address' };
      return res.redirect('/');
    }
  });
}

const doLogin = (req: Express.Request) => async (app: Application, body: Record<string, string>) => {
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
