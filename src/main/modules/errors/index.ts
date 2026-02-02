/**
 * Error responses
 */

import type { Request, Response } from 'express';

export default function (req: Request, res: Response, code: number, redirectUri?: string): Response<unknown, Record<string, unknown>> | void { 
  if (typeof redirectUri !== 'undefined') {
    return res
      .set('Content-Type', 'text/html')
      .status(code)
      // eslint-disable-next-line max-len
      .send('<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=' + redirectUri + '"></head></html>');
  }

  // Set status first off, then conditionally output info
  res.status(code);
  return res.render('_errors/'+ code + '.njk', {}, function(err: unknown, html: unknown) {
    // If something went wrong rendering the template then output JSON
    if (err) {
      return res.render('_errors/generic.njk');
    }

    // Otherwise output the template HTML
    return res.send(html);
  });
};
