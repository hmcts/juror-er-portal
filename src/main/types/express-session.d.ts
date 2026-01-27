import session from 'express-session';
import { JwtPayload } from 'jsonwebtoken';

declare module 'express-session' {
  export interface SessionData {
    user: { [key: string]: any };
    authKey: string;
    authToken: string;
    authentication: JwtPayload;
    formFields: { [key: string]: string };
    errors: { [key: string]: string };
  }
}
