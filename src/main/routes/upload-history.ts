import csrf from 'csurf';
import { Application } from 'express';

import { verify } from '../modules/auth';
import { uploadHistoryDAO } from '../objects/upload';

const csrfProtection = csrf();

export default function (app: Application): void {
  app.get('/upload-history', csrfProtection, verify, async (req, res) => {
    delete req.session.errors;
    delete req.session.formFields;

    // Call API to get upload history
    let uploadHistory;
    try {
      uploadHistory = await uploadHistoryDAO.get(app, req.session?.authToken);
    } catch (err) {
      app.logger.crit('Failed to fetch upload history: ', {
        error: typeof err.error !== 'undefined' ? err.error : err.toString(),
        laCode: req.session?.authentication?.laCode,
      });
      return res.render('_errors/generic', { err });
    }

    return res.render('upload-history/upload-history.njk', {
      uploadHistoryCount: uploadHistory?.totalUploads,
      uploadHistoryList: uploadHistory?.recentUploads || [],
    });
  });
}
