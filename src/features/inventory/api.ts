import { api } from '@/services/api';
import { normalizePage, type Paginated } from '@/services/api/pagination';
import type { StockListItem, StockMovement, StockMovementType, StockOperation, StockSummary, StockUpdateResponse } from '@/types/api';

export const inventoryApi = api.injectEndpoints({
  endpoints: (build) => ({
    getStockSummary: build.query<StockSummary, void>({
      query: () => '/api/v2/vendors/stock/summary/',
      providesTags: ['Stock'],
    }),
    listStock: build.query<Paginated<StockListItem>, { search?: string; filter?: 'all' | 'low' | 'out'; page?: number; pageSize?: number }>({
      query: ({ search, filter = 'all', page = 1, pageSize = 20 }) => ({
        url: '/api/v2/vendors/stock/',
        params: {
          search,
          page,
          page_size: pageSize,
          low_stock: filter === 'low' ? 10 : undefined,
          out_of_stock: filter === 'out' ? 'true' : undefined,
        },
      }),
      transformResponse: (data: unknown) => normalizePage<StockListItem>(data),
      providesTags: ['Stock'],
    }),
    updateStock: build.mutation<
      StockUpdateResponse,
      { product_id?: number; barcode?: string; quantity: number; operation: StockOperation; movement_type?: StockMovementType; reason?: string; reference?: string }
    >({
      query: (data) => ({ url: '/api/v2/vendors/stock/update/', method: 'POST', data }),
      invalidatesTags: (res) => ['Stock', 'StockMovements', 'Dashboard', { type: 'Products', id: 'LIST' }, ...(res ? [{ type: 'Product' as const, id: res.product_id }] : [])],
    }),
    listStockMovements: build.query<
      Paginated<StockMovement>,
      { product?: number; type?: StockMovementType | ''; from?: string; to?: string; page?: number; pageSize?: number }
    >({
      query: ({ product, type, from, to, page = 1, pageSize = 25 }) => ({
        url: '/api/v2/vendors/stock/movements/',
        params: { product, type: type || undefined, from: from || undefined, to: to || undefined, page, page_size: pageSize },
      }),
      transformResponse: (data: unknown) => normalizePage<StockMovement>(data),
      providesTags: ['StockMovements'],
    }),
  }),
});

export const { useGetStockSummaryQuery, useListStockQuery, useUpdateStockMutation, useListStockMovementsQuery } = inventoryApi;
