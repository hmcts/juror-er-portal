import { AxiosResponse } from 'axios';
import { Application } from 'express';

const secretsConfig = require('config');
const jwt = require('jsonwebtoken');

const { axiosInstance } = require('./axios-instance');

export const appSettingsObj = {
  resource: 'auth/settings',
  get: function(app: Application): Promise<AxiosResponse['data']> {
    const url = this.resource;
    const jwtToken = jwt.sign({}, secretsConfig.get('secrets.juror.er-portal-jwtNoAuthKey'), { expiresIn: secretsConfig.get('secrets.juror.er-portal-jwtTTL') });

    return axiosInstance(url, app, jwtToken, null);
  },
};