import session from 'express-session';
import { JwtPayload } from 'jsonwebtoken';

declare module 'express-session' {
  export interface SessionData {
    authKey: string;
    authToken: string;
    authentication: JwtPayload;
    isDevLogin?: boolean;
    formFields: { [key: string]: string | string[] };
    errors: { [key: string]: string };
    bannerMessage?: { type: string; message: string };
  }
}
