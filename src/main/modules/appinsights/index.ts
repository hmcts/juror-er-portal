const appInsights = require('applicationinsights');
const secretsConfig = require('config');

module.exports.AppInsights = class AppInsights {
  static defaultClient: unknown;

  constructor() {
    const appInsightsString = secretsConfig.get('secrets.juror.app-insights-connection-string');

    // Prevent duplicate logging in app insights
    process.env['APPLICATION_INSIGHTS_NO_DIAGNOSTIC_CHANNEL'] = 'true';

    if (appInsightsString) {
      // eslint-disable-next-line no-console
      console.log('Starting Appinsights');

      appInsights.setup(appInsightsString).setAutoCollectConsole(true, true).setSendLiveMetrics(true).start();

      appInsights.defaultClient.context.tags[appInsights.defaultClient.context.keys.cloudRole] = 'juror-er-portal';
      AppInsights.defaultClient = appInsights.defaultClient;
    }
  }

  static client() {
    return this.defaultClient;
  }
};
