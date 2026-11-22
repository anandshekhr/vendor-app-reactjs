import { api } from '@/services/api';
import type { CustomerDetail, CustomerList } from '@/types/api';

export type CustomerOrdering = '-last_activity' | '-spend' | '-orders' | 'name';

export const customersApi = api.injectEndpoints({
  endpoints: (build) => ({
    listCustomers: build.query<CustomerList, { q?: string; ordering?: CustomerOrdering; page?: number }>({
      query: ({ q, ordering = '-last_activity', page = 1 }) => ({ url: '/vendor/dashboard/api/customers/', params: { q: q || undefined, ordering, page } }),
      providesTags: ['Customers'],
    }),
    getCustomer: build.query<CustomerDetail, string>({
      query: (key) => `/vendor/dashboard/api/customers/${encodeURIComponent(key)}/`,
      providesTags: (_r, _e, key) => [{ type: 'Customers', id: key }],
    }),
  }),
});

export const { useListCustomersQuery, useGetCustomerQuery } = customersApi;
