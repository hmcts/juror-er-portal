/* eslint-disable @typescript-eslint/no-explicit-any */
import * as express from 'express';

const _ = require('lodash');

const SENSITIVE_KEYS: string[] = ['authorization', 'token', 'jwt', 'name'];
const UNWRAPPED_KEYS: string[] = ['auth', 'username', 'laName', 'laCode'];
const REDACTION_STRING: string = '[REDACTED]';

interface SanitisableValue {
  [key: string]: string;
}

interface Logger {
  log?: (...args: unknown[]) => void;
  [key: string]: any;
}

function sanitise(obj: SanitisableValue): SanitisableValue {
  const cloned = _.cloneDeep(obj);

  function sanitiseObject(value: any | any[]): any | any[] {
    if (_.isString(value)) {
      return value;
    } // do not alter free-form strings
    if (_.isArray(value)) {
      return value.map(sanitiseObject);
    }
    if (_.isObject(value)) {
      return _.mapValues(value, (v: any, k: string) => {
        if (k) {
          const nk = _.camelCase(String(k)).toLowerCase();
          if (UNWRAPPED_KEYS.includes(nk)) {
            return v;
          }
          if (SENSITIVE_KEYS.some(nsk => nk === nsk || nk.indexOf(nsk) !== -1 || nsk.indexOf(nk) !== -1)) {
            return REDACTION_STRING;
          }
        }
        return sanitiseObject(v);
      });
    }
    return value;
  }

  return sanitiseObject(cloned);
}

// Wrap the app.logger and mutate Logger. `levels` should be
// the levels map used by the logger (object keys are level names).
module.exports.sanitiseLog = function (origLogger: Logger, levels: Record<string, number>, app?: express.Express) {
  if (!origLogger || !_.isFunction(origLogger.log)) {
    return;
  }

  const targetLevels = Object.keys(levels || {});

  // If an app object is provided, create a wrapper and attach it to app.logger
  if (app) {
    const wrapper = Object.create(origLogger);

    targetLevels.forEach(lvl => {
      if (typeof origLogger[lvl] === 'function') {
        wrapper[lvl] = function (...args: any[]) {
          try {
            const sanitisedArgs = args.map(a => (_.isObject(a) ? sanitise(a) : a));
            return origLogger[lvl](...sanitisedArgs);
          } catch (err) {
            return origLogger[lvl](...args);
          }
        };
      }
    });

    app.logger = wrapper;
    return;
  }

  // No app provided: mutate the logger instance in-place so direct calls
  // like Logger.instance.info(...) are sanitised.
  targetLevels.forEach(lvl => {
    if (typeof origLogger[lvl] === 'function') {
      const origFn = origLogger[lvl].bind(origLogger);
      origLogger[lvl] = function (...args: any[]) {
        try {
          const sanitisedArgs = args.map(a => (_.isObject(a) ? sanitise(a) : a));
          return origFn(...sanitisedArgs);
        } catch (err) {
          return origFn(...args);
        }
      };
    }
  });
};
