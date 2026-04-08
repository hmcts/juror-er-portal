import config from 'config';

const appInsights = require('applicationinsights');

export class AppInsights {
  enable(): void {
    if (config.get('secrets.juror.app-insights-connection-string')) {
      console.log('Enabling app insights');
      appInsights
        .setup(config.get('secrets.juror.app-insights-connection-string'))
        .setAutoCollectConsole(true, true)
        .setSendLiveMetrics(true)
        .start();

      appInsights.defaultClient.context.tags[appInsights.defaultClient.context.keys.cloudRole] = 'juror-er-portal';
      appInsights.defaultClient.trackTrace({
        message: 'App insights activated',
      });
    } else {
      console.log('App insights connection string not found, app insights will not be enabled');
    }
  }
}
