import { Application } from 'express';
import _ from 'lodash';

import { logout } from '../modules/auth';

export default function (app: Application): void {
  app.get('/', (req, res) => {
    // If already logged in, force logout
    if (typeof res.locals.authentication !== 'undefined') {
      logout(app)(req);
    }

    const tmpErrors = _.clone(req.session.errors);
    const tmpBody = _.clone(req.session.formFields);
    delete req.session.errors;
    delete req.session.formFields;

    res.render('login', {
      azureLoginUrl: '/auth/sign-in',
      devLoginUrl: '/dev/sign-in',
      tmpBody,
      errors: tmpErrors,
    });
  });
}
