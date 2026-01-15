import { Application } from 'express';

const { Logger } = require('@hmcts/nodejs-logging');

const logger = Logger.getLogger('app');

export default function (app: Application): void {
  app.get('/', (req, res) => {
    res.render('login', {
      devLoginUrl: '/dev-login',
    });
  });

  app.post('/dev-login', (req, res) => {
    logger.info(`Dev login with user: ${req.body.email}`);
    return res.redirect('/');
  });
}
