import { Configuration } from '@azure/msal-node';

const clientId: string = process.env.CLIENT_ID || '[client-id]';
const tenantName: string = process.env.TENANT_NAME || 'tenant-name';
const clientSecret: string = process.env.CLIENT_SECRET || '[client-secret]';

export const authConfig: Configuration = {
  auth: {
    clientId,
    authority: `https://${tenantName}.ciamlogin.com`,
    clientSecret,
  },
};
