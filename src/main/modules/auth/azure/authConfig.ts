import { Configuration } from '@azure/msal-node';
import config from 'config';

const clientId: string = config.get('secrets.juror.er-portal-azure-app-id') || '[client-id]';
const cloudInstance: string = 'https://login.microsoftonline.com/';
const tenantId: string = config.get('secrets.juror.er-portal-azure-tenant-id') || '[tenant-id]';
const clientSecret: string = config.get('secrets.juror.er-portal-azure-client-secret') || '[client-secret]';

// const tenantSubdomain: string = process.env.TENANT_SUBDOMAIN || '';
// const clientSecret: string = process.env.CLIENT_SECRET || '[client-secret]';
// const clientId: string = process.env.CLIENT_ID || '[client-id]';


export const authConfig: Configuration = {
  auth: {
    clientId,
    //For external tenant
    // authority: `https://${tenantSubdomain}.ciamlogin.com`,
    //For workforce tenant
    authority: cloudInstance + tenantId,
    clientSecret,
  },
};
