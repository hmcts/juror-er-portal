import { Application } from 'express';

import { app as myApp } from '../app';

const healthcheck = require('@hmcts/nodejs-healthcheck');

const pkg = require('../../../package.json');

process.env.PACKAGES_NAME ??= pkg.name;
process.env.PACKAGES_PROJECT ??= pkg.name;
process.env.PACKAGES_ENVIRONMENT ??= myApp.locals.ENV;

function shutdownCheck(): boolean {
  return myApp.locals.shutdown;
}

export default function (app: Application): void {
  const healthCheckConfig = {
    checks: {
      // TODO: replace this sample check with proper checks for your application
      sampleCheck: healthcheck.raw(() => healthcheck.up()),
    },
    readinessChecks: {
      shutdownCheck: healthcheck.raw(() => {
        return shutdownCheck() ? healthcheck.down() : healthcheck.up();
      }),
    },
  };

  healthcheck.addTo(app, healthCheckConfig);
}
