import { Configuration } from '@azure/msal-node';
import config from 'config';

const cloudInstance: string = 'https://login.microsoftonline.com/';
const clientId: string = config.has('secrets.juror.er-portal-azure-app-id')
  ? config.get('secrets.juror.er-portal-azure-app-id')
  : '[client-id]';
const tenantId: string = config.has('secrets.juror.er-portal-azure-tenant-id')
  ? config.get('secrets.juror.er-portal-azure-tenant-id')
  : '[tenant-id]';
const clientSecret: string = config.has('secrets.juror.er-portal-azure-client-secret')
  ? config.get('secrets.juror.er-portal-azure-client-secret')
  : '[client-secret]';

export const authConfig: Configuration = {
  auth: {
    clientId,
    authority: cloudInstance + tenantId,
    clientSecret,
  },
};
