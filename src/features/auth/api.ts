import { api } from '@/services/api';
import type { VerifyOtpResponse } from '@/types/api';

export const authApi = api.injectEndpoints({
  endpoints: (build) => ({
    requestLoginOtp: build.mutation<{ message: string }, { phone: string }>({
      query: ({ phone }) => ({ url: '/api/v2/login/request-otp', method: 'POST', data: { phone_number: phone }, skipAuth: true }),
    }),
    verifyLoginOtp: build.mutation<VerifyOtpResponse, { phone: string; otp: string }>({
      query: ({ phone, otp }) => ({
        url: '/api/v2/login/verify-otp',
        method: 'POST',
        data: { phone_number: phone, otp, role: 'vendor' },
        skipAuth: true,
      }),
    }),
    logout: build.mutation<unknown, void>({
      query: () => ({ url: '/api/v2/logout', method: 'POST' }),
    }),
  }),
});

export const { useRequestLoginOtpMutation, useVerifyLoginOtpMutation, useLogoutMutation } = authApi;
