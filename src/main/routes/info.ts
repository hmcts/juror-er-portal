import * as os from 'os';

import { app as myApp } from '../app';
import { infoRequestHandler } from '@hmcts/info-provider';
import { Router } from 'express';
import pkg from '../../../package.json';

export default function (app: Router): void {
  app.get(
    '/info',
    infoRequestHandler({
      extraBuildInfo: {
        host: os.hostname(),
        name: pkg.name,
        version: pkg.version,
        environment: myApp.locals.ENV,
        uptime: process.uptime(),
      },
      info: {},
    })
  );
}
