import { api } from '@/services/api';
import { normalizePage, type Paginated } from '@/services/api/pagination';
import type { CatalogService, ShopServiceDetail, ShopServiceListItem } from '@/types/api';

export type ShopServiceWrite = Partial<Omit<ShopServiceDetail, 'id' | 'created_at' | 'cover_image'>>;

export const servicesApi = api.injectEndpoints({
  endpoints: (build) => ({
    listShopServices: build.query<Paginated<ShopServiceListItem>, { search?: string; status?: string; page?: number }>({
      query: ({ search, status, page = 1 }) => ({ url: '/vendor/dashboard/api/services/', params: { search, status, page } }),
      transformResponse: (data: unknown) => normalizePage<ShopServiceListItem>(data),
      providesTags: [{ type: 'Services', id: 'LIST' }],
    }),
    getShopService: build.query<ShopServiceDetail, number>({
      query: (id) => `/vendor/dashboard/api/services/${id}/`,
      providesTags: (_r, _e, id) => [{ type: 'Services', id }],
    }),
    createShopService: build.mutation<ShopServiceDetail, ShopServiceWrite | FormData>({
      query: (data) => ({ url: '/vendor/dashboard/api/services/', method: 'POST', data }),
      invalidatesTags: [{ type: 'Services', id: 'LIST' }, 'ServiceDashboard'],
    }),
    updateShopService: build.mutation<ShopServiceDetail, { id: number; data: ShopServiceWrite | FormData }>({
      query: ({ id, data }) => ({ url: `/vendor/dashboard/api/services/${id}/`, method: 'PATCH', data }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Services', id }, { type: 'Services', id: 'LIST' }, 'ServiceDashboard'],
    }),
    deleteShopService: build.mutation<void, number>({
      query: (id) => ({ url: `/vendor/dashboard/api/services/${id}/`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Services', id: 'LIST' }, 'ServiceDashboard'],
    }),
    listCatalogServices: build.query<CatalogService[], void>({
      query: () => ({ url: '/api/v2/services/', params: { page_size: 100 } }),
      transformResponse: (data: unknown) => normalizePage<CatalogService>(data).results,
      keepUnusedDataFor: 600,
    }),
  }),
});

export const {
  useListShopServicesQuery,
  useGetShopServiceQuery,
  useCreateShopServiceMutation,
  useUpdateShopServiceMutation,
  useDeleteShopServiceMutation,
  useListCatalogServicesQuery,
} = servicesApi;
