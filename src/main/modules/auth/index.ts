import { Request, Response } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';

import errors from '../errors';

export const verify = (req: Request, res: Response, next: () => void): Response<unknown, Record<string, unknown>> | void => {
  const token = req.session.authToken;

  // decode token
  if (token && req.session.authKey) {
    // verifies secret and checks expiry
    jwt.verify(token, req.session.authKey, function (err, decoded) {
      if (err) {
        return errors(req, res, 403, '/');
      }

      if (!decoded || typeof decoded === 'string') {
        return errors(req, res, 403, '/');
      }

      // if no errors, then decode and verify the token body
      req.decoded = decoded;

      const decodedPayload = decoded as JwtPayload;

      if (!decodedPayload.hasOwnProperty('username')) {
        return errors(req, res, 403, '/');
      }

      // If all is well then we check for a data tag in the response
      // and strip it out.
      if (decodedPayload.hasOwnProperty('data')) {
        req.session.authentication = decodedPayload.data as JwtPayload;
      } else {
        req.session.authentication = decodedPayload;
      }

      // Send login status to templates
      res.locals.authentication = req.session.authentication;
      res.locals.localAuthorityName = req.session.authentication.laName;

      return next();
    });
  } else {
    // Without a authentication token, we show an error page
    return errors(req, res, 403, '/');
  }
};

export const logout = (req: Request, res: Response): void => {
  delete req.session.authToken;
  delete req.session.authKey;
  delete req.session.authentication;
  delete res.locals.authentication;
};
