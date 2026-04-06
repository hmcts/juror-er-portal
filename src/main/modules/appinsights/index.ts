import config from 'config';

const appInsights = require('applicationinsights');

export class AppInsights {
  enable(): void {
    const connectionString = config.get<string>('secrets.juror.app-insights-connection-string');

    if (!connectionString) {
      return;
    }

    appInsights.setup(connectionString).setSendLiveMetrics(true).setAutoCollectConsole(true, true);

    appInsights.defaultClient.context.tags[appInsights.defaultClient.context.keys.cloudRole] = 'juror-er-portal';

    appInsights.start();

    appInsights.defaultClient.trackTrace({
      message: 'App insights activated',
    });
  }
}
