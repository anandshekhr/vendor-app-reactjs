import { api } from '@/services/api';
import { normalizePage, type Paginated } from '@/services/api/pagination';
import type { BarcodeType, Category, MasterCatalogItem, ProductDetail, ProductListItem, ScannedProduct, Unit } from '@/types/api';

export interface ProductListParams {
  search?: string;
  status?: '' | 'active' | 'inactive' | 'low_stock';
  page?: number;
}

export type ProductWrite = Partial<Omit<ProductDetail, 'id' | 'sku' | 'created_at' | 'updated_at' | 'image'>>;

export const productsApi = api.injectEndpoints({
  endpoints: (build) => ({
    listProducts: build.query<Paginated<ProductListItem>, ProductListParams>({
      query: ({ search, status, page = 1 }) => ({ url: '/vendor/dashboard/api/products/', params: { search, status, page } }),
      transformResponse: (data: unknown) => normalizePage<ProductListItem>(data),
      providesTags: (res) => [{ type: 'Products', id: 'LIST' }, ...(res?.results ?? []).map((p) => ({ type: 'Product' as const, id: p.id }))],
    }),
    getProduct: build.query<ProductDetail, number>({
      query: (id) => `/vendor/dashboard/api/products/${id}/`,
      providesTags: (_r, _e, id) => [{ type: 'Product', id }],
    }),
    createProduct: build.mutation<ProductDetail, ProductWrite | FormData>({
      query: (data) => ({ url: '/vendor/dashboard/api/products/', method: 'POST', data }),
      invalidatesTags: [{ type: 'Products', id: 'LIST' }, 'Stock', 'Dashboard'],
    }),
    updateProduct: build.mutation<ProductDetail, { id: number; data: ProductWrite | FormData }>({
      query: ({ id, data }) => ({ url: `/vendor/dashboard/api/products/${id}/`, method: 'PATCH', data }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Product', id }, { type: 'Products', id: 'LIST' }],
    }),
    deleteProduct: build.mutation<void, number>({
      query: (id) => ({ url: `/vendor/dashboard/api/products/${id}/`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Products', id: 'LIST' }, 'Stock', 'Dashboard'],
    }),
    bulkUpdateProducts: build.mutation<{ updated_count: number }, { product_ids: number[]; updates: { is_active: boolean } }>({
      query: (data) => ({ url: '/api/v2/products/bulk-update/', method: 'POST', data }),
      invalidatesTags: [{ type: 'Products', id: 'LIST' }],
    }),
    bulkDeleteProducts: build.mutation<{ deleted_count: number }, { product_ids: number[] }>({
      query: (data) => ({ url: '/api/v2/products/bulk-delete/', method: 'POST', data }),
      invalidatesTags: [{ type: 'Products', id: 'LIST' }, 'Stock', 'Dashboard'],
    }),
    /** v2 detail (adds barcode/final_price). Not shop-scoped server-side (S-3): only called after the scoped read succeeds. */
    getProductV2: build.query<ScannedProduct, number>({
      query: (id) => `/api/v2/vendors/product/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Product', id }],
    }),
    scanBarcode: build.query<ScannedProduct, string>({
      query: (barcode) => ({ url: '/api/v2/vendors/barcode/scan/', params: { barcode } }),
    }),
    registerBarcode: build.mutation<unknown, { product_id: number; barcode: string; barcode_type: BarcodeType }>({
      query: (data) => ({ url: '/api/v2/vendors/barcode/register/vendor-product/', method: 'POST', data }),
      invalidatesTags: (_r, _e, { product_id }) => [{ type: 'Product', id: product_id }],
    }),
    getCategories: build.query<Category[], void>({
      query: () => ({ url: '/api/v2/categories/', params: { all: 1, page_size: 100 } }),
      transformResponse: (data: unknown) => normalizePage<Category>(data).results,
      providesTags: ['Categories'],
      keepUnusedDataFor: 3600,
    }),
    getUnits: build.query<Unit[], void>({
      query: () => '/api/v2/units/',
      transformResponse: (data: unknown) => normalizePage<Unit>(data).results,
      providesTags: ['Units'],
      keepUnusedDataFor: 3600,
    }),
    listMasterCatalog: build.query<Paginated<MasterCatalogItem>, { search?: string; page?: number }>({
      query: ({ search, page = 1 }) => ({ url: '/vendor/dashboard/api/products/master-catalog/', params: { search, page } }),
      transformResponse: (data: unknown) => normalizePage<MasterCatalogItem>(data),
    }),
    bulkAddFromMaster: build.mutation<{ created_count: number; skipped_count: number }, number[]>({
      query: (product_ids) => ({ url: '/vendor/dashboard/api/products/bulk-add/', method: 'POST', data: { product_ids } }),
      invalidatesTags: [{ type: 'Products', id: 'LIST' }, 'Stock', 'Dashboard'],
    }),
  }),
});

export const {
  useListProductsQuery,
  useGetProductQuery,
  useGetProductV2Query,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useBulkUpdateProductsMutation,
  useBulkDeleteProductsMutation,
  useLazyScanBarcodeQuery,
  useRegisterBarcodeMutation,
  useGetCategoriesQuery,
  useGetUnitsQuery,
  useListMasterCatalogQuery,
  useBulkAddFromMasterMutation,
} = productsApi;
