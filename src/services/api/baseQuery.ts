import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import type { AxiosRequestConfig } from 'axios';
import { clients, type ApiTarget } from './client';
import { toApiError, type ApiError } from './errors';

export interface ApiRequest {
  url: string;
  method?: AxiosRequestConfig['method'];
  data?: unknown;
  params?: Record<string, unknown>;
  headers?: Record<string, string>;
  target?: ApiTarget;
  skipAuth?: boolean;
}

function cleanParams(params?: Record<string, unknown>) {
  if (!params) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') out[k] = v;
  }
  return out;
}

export const axiosBaseQuery: BaseQueryFn<ApiRequest | string, unknown, ApiError> = async (args) => {
  const req: ApiRequest = typeof args === 'string' ? { url: args } : args;
  try {
    const res = await clients[req.target ?? 'main'].request({
      url: req.url,
      method: req.method ?? 'GET',
      data: req.data,
      params: cleanParams(req.params),
      headers: req.headers,
      skipAuth: req.skipAuth,
    });
    return { data: res.status === 204 ? null : res.data };
  } catch (error) {
    return { error: toApiError(error) };
  }
};
