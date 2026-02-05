import { Application } from 'express';

import { verify } from '../modules/auth';

export default function (app: Application): void {
  app.get('/upload-guidance', verify, (req, res) => {
    res.render('upload-guidance/upload-guidance.njk');
  });
}
