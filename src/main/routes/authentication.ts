import { IdTokenClaims } from '@azure/msal-node';
import config from 'config';
import { Application } from 'express';
import * as Express from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';

import { authConfig } from '../modules/auth/azure/authConfig';
import { acquireTokenByCode, getAuthCodeUrl } from '../modules/auth/azure/authProvider';
import errors from '../modules/errors';
import { authDAO } from '../objects/login';

export default function (app: Application): void {
  app.post('/dev/sign-in', async (req, res) => {
    if (!req.body?.email) {
      app.logger.warn('No email provided for dev login');
      req.session.errors = { email: 'Please enter an email address' };
      return res.redirect('/');
    }

    try {
      await doLogin(app)(req, res, { email: req.body.email });
      return res.redirect('/data-upload');
    } catch (err) {
      app.logger.crit('Failed to log in in using developer email field', {
        email: req.body.email,
        error: typeof err.error !== 'undefined' ? err.error : err.toString(),
      });
      req.session.formFields = { email: req.body.email };
      req.session.errors = { email: 'Unable to sign in with the provided email address' };
      return res.redirect('/');
    }
  });

  app.get('/auth/sign-in', async (req, res) => {
    // eslint-disable-next-line no-useless-catch
    try {
      const url = await getAuthCodeUrl(req);
      res.redirect(url);
    } catch (err) {
      throw err;
    }
  });

  app.get('/auth/redirect', async (req, res, next) => {
    const code = (req.query.code as string | undefined) ?? undefined;

    if (code === undefined) {
      return errors(req, res, 400, '/');
    }

    let idTokenClaims: IdTokenClaims;
    try {
      const tokenResponse = await acquireTokenByCode(req, code);

      if (tokenResponse === null) {
        return errors(req, res, 500, '/');
      }

      idTokenClaims = tokenResponse.idTokenClaims;
    } catch (error) {
      next(error);
      return;
    }

    if (!idTokenClaims?.email) {
      return errors(req, res, 400, '/');
    }

    const email = idTokenClaims.email;

    try {
      await doLogin(app)(req, res, { email });
      return res.redirect('/data-upload');
    } catch (err) {
      app.logger.crit('Failed to log in in using azure auth', {
        email,
        error: typeof err.error !== 'undefined' ? err.error : err.toString(),
      });
      req.session.errors = { email: 'Unable to sign in with the provided email address' };
      return res.redirect('/');
    }
  });
  
  app.get('/auth/sign-out', (req, res) => {
    const clientId = authConfig.auth.clientId;
    const postLogoutRedirectUri: string = process.env.POST_LOGOUT_REDIRECT_URI || 'http://localhost:3000/';

    // const tenantName = process.env.TENANT_SUBDOMAIN || '';

    let logoutUrl: string = '/';

    if (clientId !== '[client-id]') {
      // logoutUrl = tenantName !== ''
      //   ? `https://${tenantName}.ciamlogin.com/${tenantName}.onmicrosoft.com/oauth2/v2.0/logout` +
      //   `?post_logout_redirect_uri=${encodeURIComponent(postLogoutRedirectUri)}`
      //   : '/';
      logoutUrl = `${authConfig.auth.authority}/oauth2/v2.0/logout?post_logout_redirect_uri=${postLogoutRedirectUri}`;
    }

    req.session.destroy((error) => {
      if (error) {
        app.logger.crit('Error destroying session during sign-out', { error });
      }

      res.redirect(logoutUrl);
    });
  });
}

export const doLogin =
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
