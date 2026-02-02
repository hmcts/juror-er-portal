import * as Express from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';

export const verify = (req: Express.Request, res: Express.Response, next: () => void): void => {
  const token = req.session.authToken;

  // decode token
  if (token && req.session.authKey) {
    // verifies secret and checks expiry
    jwt.verify(token, req.session.authKey, function (err, decoded) {
      if (err) {
        return res.redirect('/');
      }

      if (!decoded || typeof decoded === 'string') {
        return res.redirect('/');
      }

      // if no errors, then decode and verify the token body
      req.decoded = decoded;

      // if we do not have a userLevel property then we should assume this
      // token is not for a logged in user.
      const decodedPayload = decoded as JwtPayload;

      if (!decodedPayload.hasOwnProperty('username')) {
        return res.redirect('/');
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
    return res.redirect('/');
  }
};

export const logout = (req: Express.Request, res: Express.Response): void => {
  delete req.session.authToken;
  delete req.session.authKey;
  delete req.session.authentication;
  delete res.locals.authentication;
};
