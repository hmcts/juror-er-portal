import { Application } from 'express';

export default function (app: Application): void {
  app.get('/data-upload', (req, res) => {
    res.render('data-upload/data-upload.njk');
  });
}
