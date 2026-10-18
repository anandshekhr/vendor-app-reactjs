import { api } from '@/services/api';
import { normalizePage, type Paginated } from '@/services/api/pagination';
import type { OrderAction, OrderDetail, OrderListItem, VendorOrderFull } from '@/types/api';

export interface OrderListParams {
  status?: string;
  q?: string;
  page?: number;
}

export const ordersApi = api.injectEndpoints({
  endpoints: (build) => ({
    listOrders: build.query<Paginated<OrderListItem>, OrderListParams>({
      query: ({ status = 'all', q, page = 1 }) => ({ url: '/vendor/dashboard/api/orders/', params: { status, q, page } }),
      transformResponse: (data: unknown) => normalizePage<OrderListItem>(data),
      providesTags: (res) => [{ type: 'Orders', id: 'LIST' }, ...(res?.results ?? []).map((o) => ({ type: 'Order' as const, id: o.id }))],
    }),
    pollOrders: build.query<{ orders: OrderListItem[]; latest_id: number }, number>({
      query: (since) => ({ url: '/vendor/dashboard/api/orders/poll/', params: { since } }),
    }),
    getOrder: build.query<OrderDetail, number>({
      query: (id) => `/vendor/dashboard/api/orders/${id}/`,
      providesTags: (_r, _e, id) => [{ type: 'Order', id }],
    }),
    /**
     * Items, address and totals breakdown. This v2 endpoint is not shop-scoped server-side (API_MAPPING S-3), so the
     * UI only calls it after the scoped `getOrder` succeeded for the same id.
     */
    getOrderFull: build.query<VendorOrderFull, number>({
      query: (id) => `/api/v2/vendors/orders/${id}/`,
      providesTags: (_r, _e, id) => [{ type: 'Order', id }],
    }),
    orderAction: build.mutation<OrderDetail, { id: number; action: OrderAction; note?: string }>({
      query: ({ id, action, note = '' }) => ({ url: `/vendor/dashboard/api/orders/${id}/action/`, method: 'POST', data: { action, note } }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Order', id }, { type: 'Orders', id: 'LIST' }, 'Dashboard'],
    }),
    /** Vendor's full v2 order list (includes `source`), used for POS sales history and reports. */
    listVendorOrdersV2: build.query<Paginated<VendorOrderFull>, { page?: number; status?: string }>({
      query: ({ page = 1, status }) => ({ url: '/api/v2/vendors/orders/', params: { page, status } }),
      transformResponse: (data: unknown) => normalizePage<VendorOrderFull>(data),
      providesTags: [{ type: 'PosSales', id: 'LIST' }, { type: 'Orders', id: 'LIST' }],
    }),
  }),
});

export const {
  useListOrdersQuery,
  useGetOrderQuery,
  useGetOrderFullQuery,
  useOrderActionMutation,
  useListVendorOrdersV2Query,
  useLazyPollOrdersQuery,
} = ordersApi;
