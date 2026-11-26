import { AxiosRequestConfig, AxiosResponse } from 'axios';
import secretsConfig from 'config';
import { Application } from 'express';
import _ from 'lodash';

import { replaceAllObjKeys } from '../modules/utils';

const jwt = require('jsonwebtoken');

const { axiosInstance } = require('./axios-instance');

export const devLoginDAO = {
  post: (app: Application, payload: Record<string, string>): Promise<AxiosResponse['data']> => {
    const url = `${authDAO.resource}/dev-login`;
    const jwtToken = jwt.sign({}, secretsConfig.get('secrets.juror.er-portal-jwtNoAuthKey'), {
      expiresIn: secretsConfig.get('secrets.juror.er-portal-jwtTTL'),
    });
    const options: AxiosRequestConfig = {
      method: 'post',
      data: replaceAllObjKeys(_.cloneDeep(payload), _.snakeCase),
    };

    return axiosInstance(url, app, jwtToken, options);
  },
};

export const authDAO = {
  resource: 'auth/juror-er',
  post: (app: Application, laCode: string, payload: Record<string, string>): Promise<AxiosResponse['data']> => {
    const url = `${authDAO.resource}/jwt/${laCode}`;
    const jwtToken = jwt.sign({}, secretsConfig.get('secrets.juror.er-portal-jwtNoAuthKey'), {
      expiresIn: secretsConfig.get('secrets.juror.er-portal-jwtTTL'),
    });
    const options: AxiosRequestConfig = {
      method: 'post',
      data: replaceAllObjKeys(_.cloneDeep(payload), _.snakeCase),
    };

    return axiosInstance(url, app, jwtToken, options);
  },
};

export const laListDAO = {
  post: (app: Application, payload: Record<string, string>): Promise<AxiosResponse['data']> => {
    const url = `${authDAO.resource}/local-authorities`;
    const jwtToken = jwt.sign({}, secretsConfig.get('secrets.juror.er-portal-jwtNoAuthKey'), {
      expiresIn: secretsConfig.get('secrets.juror.er-portal-jwtTTL'),
    });
    const options: AxiosRequestConfig = {
      method: 'post',
      data: replaceAllObjKeys(_.cloneDeep(payload), _.snakeCase),
    };

    return axiosInstance(url, app, jwtToken, options);
  },
};
