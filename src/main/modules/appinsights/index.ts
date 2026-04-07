import appInsights from 'applicationinsights';
import config from 'config';

export class AppInsights {
  enable(): void {
    const connectionString = config.get<string>('secrets.juror.app-insights-connection-string');

    if (!connectionString) {
      return;
    }

    appInsights.setup(config.get('secrets.juror.app-insights-connection-string')).setSendLiveMetrics(true).start();

    appInsights.defaultClient.context.tags[appInsights.defaultClient.context.keys.cloudRole] = 'juror-er-portal';
    appInsights.defaultClient.trackTrace({
      message: 'App insights activated',
    });
  }
}
