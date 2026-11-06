import { api } from '@/services/api';
import type { VerifyOtpResponse } from '@/types/api';
import { toIndianE164 } from '@/utils/phone';

// The same login/signup API as the customer apps (it registers new numbers too), so a vendor's account uses the
// same "+91XXXXXXXXXX" number as everywhere else. `phone` here is the 10-digit number the vendor typed.

export const authApi = api.injectEndpoints({
  endpoints: (build) => ({
    requestLoginOtp: build.mutation<{ message: string }, { phone: string }>({
      query: ({ phone }) => ({ url: '/api/v1/login/request-otp', method: 'POST', data: { phone_number: toIndianE164(phone) }, skipAuth: true }),
    }),
    verifyLoginOtp: build.mutation<VerifyOtpResponse, { phone: string; otp: string }>({
      query: ({ phone, otp }) => ({
        url: '/api/v1/login/verify-otp',
        method: 'POST',
        data: { phone_number: toIndianE164(phone), otp, role: 'vendor' },
        skipAuth: true,
      }),
    }),
    logout: build.mutation<unknown, void>({
      query: () => ({ url: '/api/v2/logout', method: 'POST' }),
    }),
  }),
});

export const { useRequestLoginOtpMutation, useVerifyLoginOtpMutation, useLogoutMutation } = authApi;
