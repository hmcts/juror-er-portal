const _ = require('lodash');
const moment = require('moment');

require('moment-timezone');

export default {
  HttpStatusCode: function (code: number): string {
    const codeTitles: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      405: 'Method Not Allowed',
      408: 'Request Timeout',
      409: 'Conflict',
      410: 'Gone',
      412: 'Precondition Failed',
      413: 'Payload Too Large',
      415: 'Unsupported Media Type',
      422: 'Unprocessable Entity',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
      504: 'Gateway Timeout',
    };
    return codeTitles[code] || 'Unknown';
  },

  makeDate: function (date: string | number | Date): Date {
    const dateRegex = /\d{4}-\d{2}-\d{2}/g;

    // If already a Date, return it
    if (date instanceof Date) {
      return date;
    }

    // If string like YYYY-MM-DD or other ISO, let Date parse it
    if (typeof date === 'string' && dateRegex.test(date)) {
      return new Date(date);
    }

    // Fallback: try constructing a Date, otherwise return now
    try {
      return new Date(date);
    } catch (ex) {
      return new Date();
    }
  },

  dateFilter: function (dateValue: unknown, sourceFormat: string, outputFormat: string): string {
    let result = '';
    let mnt = null;
    let inputFormat;
    const dateFilterDefaultFormat = 'DD/MM/YYYY';
    const errs = [];

    const date = _.cloneDeep(dateValue);

    if (typeof date === 'string') {
      if (/\d\d[-/]\d\d[-/]\d\d\d\d/.exec(date)) {
        inputFormat = 'DD/MM/YYYY';
      }
    }

    if (Array.isArray(date) && date.length >= 3) {
      date[1] = date[1] - 1;
    }

    try {
      mnt = moment(date, inputFormat).tz('Europe/London');
    } catch (err) {
      // Collect error for logging below, but do not expose details to the end user.
      errs.push(err);
    }
    if (mnt) {
      try {
        if (dateFilterDefaultFormat !== null) {
          result = mnt.format(outputFormat || dateFilterDefaultFormat);
        } else {
          result = mnt.format(outputFormat);
        }
      } catch (err) {
        // Collect error for logging below, but do not expose details to the end user.
        errs.push(err);
      }
    }

    if (errs.length) {
      // Log detailed errors on the server for debugging, but return a generic value
      // so that stack traces or internal error messages are not exposed to users.
      console.error('dateFilter encountered error(s):', errs);
      return '';
    }
    return result;
  },
};
