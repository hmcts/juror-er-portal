import { ConfidentialClientApplication } from '@azure/msal-node';

import { authConfig } from './authConfig';

const msalClient = new ConfidentialClientApplication({
  auth: {
    clientId: authConfig.auth.clientId,
    authority: authConfig.auth.authority,
    clientSecret: authConfig.auth.clientSecret,
  },
});

export default msalClient;
