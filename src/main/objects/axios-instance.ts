import axios, { AxiosResponse, Method } from 'axios';
import { Application } from 'express';

const _ = require('lodash');

type TransformerKey = 'default' | 'withHeaders' | 'getSingle';

interface ResponseWithHeaders {
  headers: AxiosResponse['headers'],
  data: AxiosResponse['data'],
}

const transformers: Record<TransformerKey, (response: AxiosResponse) => AxiosResponse['data'] | ResponseWithHeaders > = {
  default: (response: AxiosResponse) => response.data,
  withHeaders: (response: AxiosResponse) => ({ headers: response.headers, data: response.data }),
  getSingle: (response: AxiosResponse) => {
    let returnData = response.data;

    if (_.isArray(returnData)) {
      returnData = returnData.data[0];
    }

    return returnData;
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
): Promise<AxiosResponse['data'] | ResponseWithHeaders> =>{
  const options = { ...defaultOptions, ...(opts || {}) } as typeof defaultOptions;
  const client = axios.create({
    baseURL: process.env.API_ENDPOINT || 'http://localhost:8080/api/v1/',
    timeout: 5000,
    headers: {
      'Content-type': 'application/vnd.api+json',
      'Accept': 'application/json',
      'Authorization': jwtToken || '',
    },
  });

  const data = options.data ?? {};

  client.interceptors.request.use((request) => {
    app.logger.debug('Sending request to API: ' + request.url, {
      baseUrl: request.baseURL,
      url: request.url,
      headers: request.headers,
      method: request.method,
    });
    return request;
  });

  return client.request({ url, method: options.method, data })
    .then((response: AxiosResponse) => transformers[options.transformer](response));
};