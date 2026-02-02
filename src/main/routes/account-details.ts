import { Application } from 'express';

import { verify } from '../modules/auth';

export default function (app: Application): void {
  app.get('/account-details', verify, (req, res) => {
    res.render('account-details/account-details.njk');
  });
}
