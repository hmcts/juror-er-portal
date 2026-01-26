import { AxiosResponse } from 'axios';
import { Application } from 'express';

const secretsConfig = require('config');
const jwt = require('jsonwebtoken');

const { axiosInstance } = require('./axios-instance');

// TODO: OBJECT DEFINITION TEMPLATE TO BE REMOVED LATER AS NOT NEEDED
export const appSettingsObj = {
  resource: 'auth/settings',
  get: (app: Application): Promise<AxiosResponse['data']> => {
    const url = appSettingsObj.resource;
    const jwtToken = jwt.sign({}, secretsConfig.get('secrets.juror.er-portal-jwtNoAuthKey'), {
      expiresIn: secretsConfig.get('secrets.juror.er-portal-jwtTTL'),
    });

    return axiosInstance(url, app, jwtToken, null);
  },
};
