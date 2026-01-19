import { Application } from 'express';

export default function (app: Application): void {
  app.get('/account-details', (req, res) => {
    res.render('account-details/account-details.njk');
  });
}
