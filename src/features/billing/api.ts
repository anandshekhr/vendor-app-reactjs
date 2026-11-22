import { api } from '@/services/api';
import type { BillingState } from '@/types/api';

export const billingApi = api.injectEndpoints({
  endpoints: (build) => ({
    getBilling: build.query<BillingState, void>({
      query: () => '/vendor/dashboard/api/billing/',
      providesTags: ['Billing'],
    }),
    settleBilling: build.mutation<BillingState, void>({
      query: () => ({ url: '/vendor/dashboard/api/billing/settle/', method: 'POST' }),
      invalidatesTags: ['Billing', 'Wallet', 'Shop', 'Dashboard', 'Notifications'],
    }),
  }),
});

export const { useGetBillingQuery, useSettleBillingMutation } = billingApi;
