import { api } from '@/services/api';
import type { ShopDocumentRecord, ShopProfile, StoreHour, VendorMe } from '@/types/api';

export const profileApi = api.injectEndpoints({
  endpoints: (build) => ({
    getMe: build.query<VendorMe, void>({
      query: () => '/api/v2/vendors/me/',
      providesTags: ['Me'],
    }),
    getShopProfile: build.query<ShopProfile, void>({
      query: () => '/vendor/dashboard/api/store/profile/',
      providesTags: ['Shop'],
    }),
    updateShopProfile: build.mutation<ShopProfile, Partial<ShopProfile> | FormData>({
      query: (data) => ({ url: '/vendor/dashboard/api/store/profile/', method: 'PATCH', data }),
      invalidatesTags: ['Shop', 'Me'],
    }),
    getStoreHours: build.query<StoreHour[], void>({
      query: () => '/vendor/dashboard/api/store/hours/',
      providesTags: ['StoreHours'],
    }),
    updateStoreHours: build.mutation<StoreHour[], Omit<StoreHour, 'day_label'>[]>({
      // The view accepts either a list or {rows}; rows use `day` as the key (vendor_dashboard/api/services.py).
      query: (rows) => ({
        url: '/vendor/dashboard/api/store/hours/',
        method: 'PUT',
        data: rows.map((r) => ({ day: r.day_of_week, opening_time: r.opening_time, closing_time: r.closing_time, is_open: r.is_open })),
      }),
      invalidatesTags: ['StoreHours'],
    }),
    getStoreDocuments: build.query<ShopDocumentRecord | null, void>({
      query: () => '/vendor/dashboard/api/store/documents/',
      providesTags: ['Documents'],
    }),
    updateStoreDocuments: build.mutation<ShopDocumentRecord, Partial<Omit<ShopDocumentRecord, 'id'>>>({
      query: (data) => ({ url: '/vendor/dashboard/api/store/documents/', method: 'PATCH', data }),
      invalidatesTags: ['Documents', 'Me'],
    }),
  }),
});

export const {
  useGetMeQuery,
  useGetShopProfileQuery,
  useUpdateShopProfileMutation,
  useGetStoreHoursQuery,
  useUpdateStoreHoursMutation,
  useGetStoreDocumentsQuery,
  useUpdateStoreDocumentsMutation,
} = profileApi;
