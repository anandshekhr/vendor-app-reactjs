import { api } from '@/services/api';
import type { PosCheckoutRequest, PosProduct, VendorOrderFull } from '@/types/api';

// POS is served by api-services (/api/v2/vendors/pos/*). `target: 'vendor'` resolves to the same origin unless
// VITE_VENDOR_API_BASE_URL points it at a separate deployment.

export const posApi = api.injectEndpoints({
  endpoints: (build) => ({
    posLookupBarcode: build.query<PosProduct, string>({
      query: (barcode) => ({ url: '/api/v2/vendors/pos/lookup/', params: { barcode }, target: 'vendor' }),
    }),
    posSearch: build.query<PosProduct[], string>({
      query: (q) => ({ url: '/api/v2/vendors/pos/lookup/', params: { q }, target: 'vendor' }),
    }),
    posCheckout: build.mutation<VendorOrderFull, { request: PosCheckoutRequest; idempotencyKey: string }>({
      query: ({ request, idempotencyKey }) => ({
        url: '/api/v2/vendors/pos/checkout/',
        method: 'POST',
        data: request,
        target: 'vendor',
        // Forward-compatible: ignored by today's backend (API_MAPPING G-9).
        headers: { 'Idempotency-Key': idempotencyKey },
      }),
      invalidatesTags: ['Stock', 'Dashboard', { type: 'Products', id: 'LIST' }, { type: 'PosSales', id: 'LIST' }],
    }),
  }),
});

export const { useLazyPosLookupBarcodeQuery, usePosSearchQuery, usePosCheckoutMutation } = posApi;
