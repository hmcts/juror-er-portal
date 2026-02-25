import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { Application } from 'express';

//const jwt = require('jsonwebtoken');

const { axiosInstance } = require('./axios-instance');

export const uploadStatusDAO = {
  resource: 'juror-er/upload/status/{la_code}',
  get: (app: Application, jwtToken: string | undefined, laCode: string): Promise<AxiosResponse['data']> => {
    const url = uploadStatusDAO.resource.replace('{la_code}', laCode);
    const options: AxiosRequestConfig = {
      method: 'get',
    };
    return axiosInstance(url, app, jwtToken, options);
  },
};

export const uploadDashboardDAO = {
  resource: 'juror-er/upload/dashboard',
  get: (app: Application, jwtToken: string | undefined): Promise<AxiosResponse['data']> => {
    const url = uploadDashboardDAO.resource;
    const options: AxiosRequestConfig = {
      method: 'get',
    };
    return axiosInstance(url, app, jwtToken, options);
  },
};

export const uploadStatusUpdateDAO = {
  resource: 'juror-er/upload/file',
  post: (
    app: Application,
    jwtToken: string | undefined,
    payload: Record<string, string | number>
  ): Promise<AxiosResponse['data']> => {
    const url = uploadStatusUpdateDAO.resource;
    const options: AxiosRequestConfig = {
      method: 'post',
      data: payload,
    };

    return axiosInstance(url, app, jwtToken, options);
  },
};
