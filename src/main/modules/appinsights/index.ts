import config from 'config';

const appInsights = require('applicationinsights');

export class AppInsights {
  enable(): void {
    if (config.get('secrets.juror.app-insights-connection-string')) {
      appInsights.setup(config.get('secrets.juror.app-insights-connection-string')).setSendLiveMetrics(true).start();

      appInsights.defaultClient.context.tags[appInsights.defaultClient.context.keys.cloudRole] = 'juror-er-portal';
      appInsights.defaultClient.trackTrace({
        message: 'App insights activated',
      });
    }
  }
}
