import * as path from 'path';

import * as bodyParser from 'body-parser';
import config = require('config');
import cookieParser from 'cookie-parser';
import express from 'express';
import RateLimit from 'express-rate-limit';
import { glob } from 'glob';

import { HTTPError } from './HttpError';
import { AppInsights } from './modules/appinsights';
import { Helmet } from './modules/helmet';
import { Logger } from './modules/logger';
import { Nunjucks } from './modules/nunjucks';
import { PropertiesVolume } from './modules/properties-volume';
import { SessionConfig } from './modules/session';

const { setupDev } = require('./development');

const env = process.env.NODE_ENV || 'development';
const skipSSO = !!process.env.SKIP_SSO || false;
const developmentMode = env === 'development';
const enContent = require(path.join(__dirname, 'public/assets/i18n/en.json'));

const limiter = RateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requests per windowMs
});

export const app = express();
app.locals.ENV = env;
app.locals.skipSSO = skipSSO;

new Logger(config.get('logger')).initLogger(app);
new PropertiesVolume().enableFor(app);
new AppInsights().enable();
new Nunjucks(developmentMode).enableFor(app);
// secure the application by adding various HTTP headers to its responses
new Helmet(config.get('security')).enableFor(app);
new SessionConfig().start(app);

app.get('/favicon.ico', limiter, (req, res) => {
  res.sendFile(path.join(__dirname, '/public/assets/images/favicon.ico'));
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, max-age=0, must-revalidate, no-store');
  next();
});

// store i18n content JSON in locals
app.use((req, res, next) => {
  res.locals.text = enContent;
  next();
});

glob
  .sync(__dirname + '/routes/**/*.+(ts|js)')
  .map(filename => require(filename))
  .forEach(route => route.default(app));

setupDev(app, developmentMode);
// returning "not found" page for requests with paths not resolved by the router
app.use((req, res) => {
  res.status(404);
  res.render('not-found');
});

// error handler
app.use((err: HTTPError, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  app.logger.crit(`${err.stack || err}`);

  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = env === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});
