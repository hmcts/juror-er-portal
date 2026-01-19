import { Application } from 'express';

export default function (app: Application): void {
  app.get('/', (req, res) => {
    if (req.session?.user) {
      app.logger.info('Logged in user', {
        user: req.session.user,
      });
      delete req.session.user;
    }
    res.render('login', {
      devLoginUrl: '/dev-login',
    });
  });

  app.post('/dev-login', (req, res) => {
    app.logger.crit('Dev login request', {
      email: req.body.email,
    });
    req.session.user = {
      email: req.body.email,
    };
    return res.redirect('/');
  });
}
