import { IdTokenClaims } from '@azure/msal-node';

declare module "@azure/msal-node" {
  interface IdTokenClaims {
    email?: string;
  }
}