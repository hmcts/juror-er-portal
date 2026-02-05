import * as path from 'path';

import * as express from 'express';
import * as nunjucks from 'nunjucks';

import filters from '../../modules/filters';

export class Nunjucks {
  constructor(public developmentMode: boolean) {
    this.developmentMode = developmentMode;
  }

  enableFor(app: express.Express): void {
    app.set('view engine', 'njk');
    const govukTemplates = path.dirname(require.resolve('govuk-frontend/package.json')) + '/dist';
    const viewsPath = path.join(__dirname, '..', '..', 'views');

    const env = nunjucks.configure([govukTemplates, viewsPath], {
      autoescape: true,
      watch: this.developmentMode,
      express: app,
    });

    // register custom filters on the nunjucks environment
    Object.entries(filters).forEach(([name, fn]) => {
      env.addFilter(name, fn);
    });

    app.use((req, res, next) => {
      res.locals.pagePath = req.path;
      res.locals.csrftoken = req.csrfToken;
      res.locals.env = app.locals.ENV;
      res.locals.govukRebrand = true;
      next();
    });
  }
}
