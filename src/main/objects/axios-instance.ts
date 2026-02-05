import axios, { AxiosResponse, Method } from 'axios';
import { Application } from 'express';

import { replaceAllObjKeys } from '../modules/utils';

const _ = require('lodash');

type TransformerKey = 'default' | 'withHeaders' | 'getSingle';

interface ResponseWithHeaders {
  headers: AxiosResponse['headers'];
  data: AxiosResponse['data'];
}

const transformers: Record<TransformerKey, (response: AxiosResponse) => AxiosResponse['data'] | ResponseWithHeaders> = {
  default: (response: AxiosResponse) => replaceAllObjKeys(response.data, _.camelCase),
  withHeaders: (response: AxiosResponse) => ({
    headers: response.headers,
    data: replaceAllObjKeys(response.data, _.camelCase),
  }),
  getSingle: (response: AxiosResponse) => {
    let returnData = response.data;

    if (_.isArray(returnData)) {
      returnData = replaceAllObjKeys(returnData[0], _.camelCase);
    }

    return replaceAllObjKeys(returnData, _.camelCase);
  },
};

const defaultOptions: { method: Method; transformer: TransformerKey; data?: unknown } = {
  method: 'get',
  transformer: 'default',
};

export const axiosInstance = (
  url: string,
  app: Application,
  jwtToken?: string,
  opts?: Partial<typeof defaultOptions>
): Promise<AxiosResponse['data'] | ResponseWithHeaders> => {
  const options = { ...defaultOptions, ...(opts || {}) } as typeof defaultOptions;
  const client = axios.create({
    baseURL: process.env.API_ENDPOINT || 'http://localhost:8080/api/v1/',
    timeout: 5000,
    headers: {
      'Content-type': 'application/vnd.api+json',
      Accept: 'application/json',
      Authorization: jwtToken || '',
    },
  });

  const data = options.data ?? {};

  client.interceptors.request.use(request => {
    app.logger.debug('Sending request to API: ' + request.url, {
      baseUrl: request.baseURL,
      url: request.url,
      headers: request.headers,
      method: request.method,
    });
    return request;
  });

  client.interceptors.response.use(
    response => {
      return transformers[options.transformer](response);
    },
    err => {
      const error = {
        statusCode: err.response?.status || 500,
        error: {
          message: err.response?.data.message,
          code: err.response?.data.code || err.code,
          // trace: err.response?.data.trace,
        },
      };

      return Promise.reject(error);
    }
  );

  return client.request({ url, method: options.method, data });
};
