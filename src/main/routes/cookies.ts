import csrf from 'csurf';
import { Application } from 'express';

export default function (app: Application): void {
  const csrfProtection = csrf({ cookie: true });

  app.get('/cookies', csrfProtection, (req, res) => {
    delete req.session.errors;
    delete req.session.formFields;

    res.render('cookies/cookies', {
      csrftoken: req.csrfToken(),
    });
  });
}
