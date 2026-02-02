import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { Application } from 'express';

const { axiosInstance } = require('./axios-instance');

export const usersDAO = {
  resource: 'juror-er/users/{la_code}',
  get: (app: Application, jwtToken: string | undefined, laCode: string): Promise<AxiosResponse['data']> => {
    const url = usersDAO.resource.replace('{la_code}', laCode);
    const options: AxiosRequestConfig = {
      method: 'get',
    };

    return axiosInstance(url, app, jwtToken, options);
  },
};
