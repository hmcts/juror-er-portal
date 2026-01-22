import { Application } from 'express';

export default function (app: Application): void {
  app.get('/upload-guidance', (req, res) => {
    res.render('upload-guidance/upload-guidance.njk');
  });
}
