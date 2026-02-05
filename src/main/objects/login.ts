import { AxiosRequestConfig, AxiosResponse } from 'axios';
import secretsConfig from 'config';
import { Application } from 'express';

const jwt = require('jsonwebtoken');

const { axiosInstance } = require('./axios-instance');

export const authDAO = {
  resource: 'auth/juror-er/jwt',
  post: (app: Application, payload: Record<string, string>): Promise<AxiosResponse['data']> => {
    const url = authDAO.resource;
    const jwtToken = jwt.sign({}, secretsConfig.get('secrets.juror.er-portal-jwtNoAuthKey'), {
      expiresIn: secretsConfig.get('secrets.juror.er-portal-jwtTTL'),
    });
    const options: AxiosRequestConfig = {
      method: 'post',
      data: payload,
    };

    return axiosInstance(url, app, jwtToken, options);
  },
};
