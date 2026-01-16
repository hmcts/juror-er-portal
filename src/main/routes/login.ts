import { Application } from 'express';

const { Logger } = require('@hmcts/nodejs-logging');
const logger = Logger.getLogger('app');

export default function (app: Application): void {
  app.get('/', (req, res) => {
    if (req.session?.user) {
      console.log(`\n\nLogged in user: ${JSON.stringify(req.session.user)}\n\n`);
      delete req.session.user;
    }
    res.render('login', {
      devLoginUrl: '/dev-login',
    });
  });

  app.post('/dev-login', (req, res) => {
    logger.info(`Dev login request with user: ${req.body.email}`);
    req.session.user = {
      email: req.body.email,
    };
    return res.redirect('/');
  });
}
