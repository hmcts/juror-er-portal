import appInsights from 'applicationinsights';
import config from 'config';

export class AppInsights {
  enable(): void {
    const connectionString = config.get<string>('secrets.juror.app-insights-connection-string');

    if (!connectionString) {
      return;
    }

    process.env.OTEL_SERVICE_NAME = 'juror-er-portal';
    process.env.OTEL_RESOURCE_ATTRIBUTES = 'service.name=juror-er-portal';

    appInsights.setup(connectionString).setSendLiveMetrics(true).setAutoCollectConsole(true, true);

    appInsights.start();

    appInsights.defaultClient.trackTrace({
      message: 'App insights activated',
    });
  }
}
