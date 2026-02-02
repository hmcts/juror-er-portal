import { Application } from 'express';

import { verify } from '../modules/auth';

export default function (app: Application): void {
  app.get('/data-upload', verify, (req, res) => {
    res.render('data-upload/data-upload.njk');
  });
}
