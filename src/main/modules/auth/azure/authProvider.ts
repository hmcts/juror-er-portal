import type { AuthenticationResult, AuthorizationCodeRequest, AuthorizationUrlRequest } from '@azure/msal-node';
import type { Request } from 'express';

import msalClient from './msalClient';

const SCOPES = ['User.Read', 'email'];

export async function getAuthCodeUrl(_req: Request): Promise<string> {
  const authCodeUrlParameters: AuthorizationUrlRequest = {
    scopes: SCOPES,
    redirectUri: process.env.REDIRECT_URI ?? 'http://localhost:3000/auth/redirect',
  };

  const url = await msalClient.getAuthCodeUrl(authCodeUrlParameters);
  return url;
}

export async function acquireTokenByCode(_req: Request, code: string): Promise<AuthenticationResult | null> {
  const tokenRequest: AuthorizationCodeRequest = {
    code,
    scopes: SCOPES,
    redirectUri: process.env.REDIRECT_URI ?? 'http://localhost:3000/auth/redirect',
  };

  const tokenResponse = await msalClient.acquireTokenByCode(tokenRequest);
  return tokenResponse ?? null;
}
