import { IdTokenClaims } from '@azure/msal-node';
import config from 'config';
import csrf from 'csurf';
import { Application } from 'express';
import * as Express from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import _ from 'lodash';

import { logout } from '../modules/auth';
import { authConfig } from '../modules/auth/azure/authConfig';
import { acquireTokenByCode, getAuthCodeUrl } from '../modules/auth/azure/authProvider';
import errors from '../modules/errors';
import { authDAO, laListDAO } from '../objects/login';

export default function (app: Application): void {
  const csrfProtection = csrf({ cookie: true });

  if (process.env.NODE_ENV === 'development' || process.env.SKIP_SSO === 'true') {
    app.post('/dev/sign-in', csrfProtection, async (req, res) => {
      if (!req.body?.email) {
        app.logger.warn('No email provided for dev login');
        req.session.errors = { email: res.locals.text.VALIDATION.LOGIN.EMAIL_REQUIRED };
        return res.redirect('/');
      }

      req.session.email = req.body.email;
      req.session.isDevLogin = true;

      return res.redirect('/auth/la-list');
    });
  }

  app.get('/auth/sign-in', async (req, res) => {
    if (authConfig.auth.clientId === '[client-id]' || authConfig.auth.clientSecret === '[client-secret]') {
      app.logger.warn('Azure authentication is not configured');
      req.session.errors = { login: res.locals.text.VALIDATION.LOGIN.AZURE_NOT_CONFIGURED };
      return res.redirect('/');
    }
    // eslint-disable-next-line no-useless-catch
    try {
      const url = await getAuthCodeUrl(req);
      res.redirect(url);
    } catch (err) {
      throw err;
    }
  });

  app.get('/auth/la-list', async (req, res) => {
    const body = { email: req.session.email || req.session.authentication?.username };
    if (!body) {
      req.session.errors = { email: 'Email is required for local authority list' };

      return res.redirect('/');
    }

    let localAuthorityList;
    try {
      localAuthorityList = await laListDAO.post(app, body);
    } catch (err) {
      app.logger.crit('Failed to get local authority list', {
        email: body.email,
        error: typeof err.error !== 'undefined' ? err.error : err.toString(),
      });
      req.session.errors = { email: res.locals.text.VALIDATION.LOGIN.LOGIN_FAILED };
      return res.redirect('/');
    }

    if (localAuthorityList.length === 1) {
      try {
        await doLogin(app)(req, res, localAuthorityList[0].laCode, { email: body.email });
        return res.redirect('/data-upload');
      } catch (err) {
        app.logger.crit('Failed to log in using a single local authority', {
          email: body.email,
          error: typeof err.error !== 'undefined' ? err.error : err.toString(),
        });
        req.session.formFields = { email: body.email };
        req.session.errors = { email: handleLoginError(res, err.error) };
        return res.redirect('/');
      }
    }

    const tmpErrors = _.clone(req.session.errors);
    delete req.session.errors;

    res.render('login/la-list.njk', {
      laList: localAuthorityList,
      email: req.session.email,
      selectedLa: req.session.selectedLa, // this only gets set if the user is authenticated
      postUrl: '/auth/la-list',
      cancelUrl: '/',
      errors: tmpErrors,
    });
  });

  app.post('/auth/la-list', async (req, res) => {
    const laCode = req.body.la?.split('-').pop();
    const body = { email: req.session.email || req.session?.authentication?.username, laCode };

    if (!laCode) {
      req.session.errors = { laList: 'Select the local authority you want to manage' };

      return res.redirect('/auth/la-list');
    }

    try {
      await doLogin(app)(req, res, laCode, body);
      return res.redirect('/data-upload');
    } catch (err) {
      app.logger.crit('Failed to log in when selecting a local authority', {
        email: body.email,
        error: typeof err.error !== 'undefined' ? err.error : err.toString(),
      });
      req.session.formFields = { email: body.email };
      req.session.errors = { email: handleLoginError(res, err.error) };
      return res.redirect('/');
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

    if (!idTokenClaims?.preferred_username) {
      return errors(req, res, 400, '/');
    }

    const email = idTokenClaims.preferred_username;

    req.session.email = email;

    return res.redirect('/auth/la-list');
  });

  app.get('/auth/sign-out', (req, res) => {
    const clientId = authConfig.auth.clientId;
    const postLogoutRedirectUri: string = process.env.POST_LOGOUT_REDIRECT_URI || 'http://localhost:3000/';

    let logoutUrl: string = '/';

    if (!req.session.isDevLogin && (clientId !== '[client-id]' || authConfig.auth.clientSecret !== '[client-secret]')) {
      logoutUrl = `${authConfig.auth.authority}/oauth2/v2.0/logout?post_logout_redirect_uri=${postLogoutRedirectUri}`;
    }

    logout(app)(req);

    res.redirect(logoutUrl);
  });
}

export const doLogin =
  (app: Application) =>
  async (req: Express.Request, res: Express.Response, laCode: string, body: Record<string, string>): Promise<void> => {
    const jwtResponse = await authDAO.post(app, laCode, body);
    req.session.authKey = config.get('secrets.juror.er-portal-jwtKey');
    req.session.authToken = jwtResponse.jwt;

    if (req.session.authToken) {
      req.session.authentication = jwt.decode(req.session.authToken) as JwtPayload;
    }
    delete req.session.email;

    app.logger.info('User logged in', {
      auth: req.session.authentication,
      data: { body },
    });
  };

const handleLoginError = (res: Express.Response, error: Record<string, string>) => {
  switch (error.message) {
    case 'User is not active':
      return res.locals.text.VALIDATION.LOGIN.USER_INACTIVE;
    case 'User not found':
      return res.locals.text.VALIDATION.LOGIN.USER_NOT_FOUND;
    default:
      return res.locals.text.VALIDATION.LOGIN.LOGIN_FAILED;
  }
};
