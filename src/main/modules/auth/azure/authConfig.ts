import { Configuration } from '@azure/msal-node';
import config from 'config';

const clientId: string = config.get('secrets.juror.er-portal-azure-app-id') || '[client-id]';
const cloudInstance: string = 'https://login.microsoftonline.com/';
const tenantId: string = config.get('secrets.juror.er-portal-azure-tenant-id') || '[tenant-id]';
const clientSecret: string = config.get('secrets.juror.er-portal-azure-client-secret') || '[client-secret]';

export const authConfig: Configuration = {
  auth: {
    clientId,
    authority: cloudInstance + tenantId,
    clientSecret,
  },
};
