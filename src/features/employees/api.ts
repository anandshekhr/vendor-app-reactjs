import { api } from '@/services/api';
import { normalizePage } from '@/services/api/pagination';
import type { Provider, ProviderAvailability, ProviderAvailabilityResponse } from '@/types/api';

/** A new or edited staff member. The server adds them to your own shop and finds or creates their login by phone. */
export interface ProviderCreate {
  full_name: string;
  phone: string;
  email: string;
  role?: string;
  specialties?: string;
  experience_years?: number;
  is_available?: boolean;
}

export const employeesApi = api.injectEndpoints({
  endpoints: (build) => ({
    listProviders: build.query<Provider[], number>({
      query: (shopId) => ({ url: '/api/v2/shops/providers/list/', params: { shop_id: shopId, page_size: 100 } }),
      transformResponse: (data: unknown) => normalizePage<Provider>(data).results,
      providesTags: ['Employees'],
    }),
    createProvider: build.mutation<Provider, ProviderCreate>({
      query: (data) => ({ url: '/api/v2/shops/providers/create/', method: 'POST', data }),
      invalidatesTags: ['Employees', 'ServiceDashboard'],
    }),
    updateProvider: build.mutation<Provider, { id: number } & Partial<ProviderCreate>>({
      query: ({ id, ...data }) => ({ url: `/api/v2/shops/providers/${id}/`, method: 'PATCH', data }),
      invalidatesTags: ['Employees'],
    }),
    removeProvider: build.mutation<void, number>({
      query: (id) => ({ url: `/api/v2/shops/providers/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['Employees', 'ServiceDashboard'],
    }),
    getProviderAvailability: build.query<ProviderAvailabilityResponse, { providerId: number; date?: string }>({
      query: ({ providerId, date }) => ({ url: `/api/v2/shops/providers/${providerId}/availability/`, params: { date } }),
      providesTags: (_r, _e, { providerId }) => [{ type: 'Employees', id: providerId }],
    }),
    saveProviderAvailability: build.mutation<unknown, { providerId: number; rows: Omit<ProviderAvailability, 'id'>[] }>({
      query: ({ providerId, rows }) => ({
        url: `/api/v2/shops/providers/${providerId}/availability/`,
        method: 'POST',
        data: { provider_availability: rows },
      }),
      invalidatesTags: (_r, _e, { providerId }) => [{ type: 'Employees', id: providerId }],
    }),
  }),
});

export const {
  useListProvidersQuery,
  useCreateProviderMutation,
  useUpdateProviderMutation,
  useRemoveProviderMutation,
  useGetProviderAvailabilityQuery,
  useSaveProviderAvailabilityMutation,
} = employeesApi;
