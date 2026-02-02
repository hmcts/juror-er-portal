import { Application } from 'express';

import { verify } from '../modules/auth';
import { usersDAO } from '../objects/users';


export default function (app: Application): void {
  app.get('/account-access', verify, async (req, res) => {
    let laUserDetails;
    try {
      laUserDetails = (await usersDAO.get(app, req.session?.authToken, req.session?.authentication?.laCode)).laUserDetails;
    } catch (err) {
      app.logger.crit('Failed to fetch local authority user details', { auth: req.session.authentication, error: err });
      return res.redirect('/data-upload');
    }

    res.render('account-access/account-access.njk', {
      laUserDetails,
    });
  });
}
