import { setHeadlessWhen } from '@codeceptjs/configure';

import { config as testConfig } from './config.ts';

setHeadlessWhen(testConfig.TestHeadlessBrowser);

export const config: CodeceptJS.MainConfig = {
  name: 'functional',
  noGlobals: true,
  gherkin: testConfig.Gherkin,
  output: '../../functional-output/functional/reports',
  helpers: testConfig.helpers,
  tests: './*_test.{js,ts}',
  plugins: {
    pause: {
      enabled: !testConfig.TestHeadlessBrowser,
      on: 'fail',
    },
    retryFailedStep: {
      enabled: true,
    },
    screenshot: {
      enabled: true,
      fullPageScreenshots: true,
      on: 'fail',
    },
  },
};
