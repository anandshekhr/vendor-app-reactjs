import { api } from '@/services/api';
import type { OnboardingCategory, VendorApplication } from '@/types/api';

export const onboardingApi = api.injectEndpoints({
  endpoints: (build) => ({
    getOnboardingCategories: build.query<OnboardingCategory[], void>({
      query: () => ({ url: '/api/vendor-onboarding/categories/', params: { page_size: 100 }, skipAuth: true }),
      transformResponse: (data: unknown) => (Array.isArray(data) ? data : ((data as { results?: OnboardingCategory[] })?.results ?? [])),
    }),
    sendOnboardingOtp: build.mutation<void, string>({
      // NOTE: this endpoint currently echoes the OTP in its response (API_MAPPING S-1). The response body is
      // deliberately discarded here so the code is never stored in state or rendered.
      query: (phone) => ({ url: '/api/vendor-onboarding/send-otp/', method: 'POST', data: { phone }, skipAuth: true }),
      transformResponse: () => undefined,
    }),
    verifyOnboardingOtp: build.mutation<{ verified: boolean }, { phone: string; otp: string }>({
      query: (data) => ({ url: '/api/vendor-onboarding/verify-otp/', method: 'POST', data, skipAuth: true }),
    }),
    submitApplication: build.mutation<VendorApplication, FormData>({
      query: (data) => ({ url: '/api/vendor-onboarding/applications/', method: 'POST', data, skipAuth: true }),
    }),
  }),
});

export const { useGetOnboardingCategoriesQuery, useSendOnboardingOtpMutation, useVerifyOnboardingOtpMutation, useSubmitApplicationMutation } = onboardingApi;
