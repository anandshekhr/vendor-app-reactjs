import { api } from '@/services/api';
import type { Paginated } from '@/services/api/pagination';
import type {
  PrintDocumentLink,
  PrintFulfilmentType,
  PrintOrderDetail,
  PrintOrderListItem,
  PrintOrderStatus,
  PrintOrderSummary,
  PrintRateCard,
  PrintShopSettings,
} from '@/types/api';

const BASE = '/api/v1/print-shop/vendor';

export type PrintBucket = 'new' | 'quotes' | 'in_progress' | 'ready' | 'out' | 'done' | 'closed';

export interface PrintOrderListParams {
  bucket?: PrintBucket | '';
  fulfilment_type?: PrintFulfilmentType | '';
  q?: string;
  page?: number;
}

const orderTags = (id: string) => [
  { type: 'PrintOrder' as const, id },
  { type: 'PrintOrders' as const, id: 'LIST' },
];

/** Vendor actions that take the order id plus an optional body and return the updated order. */
const action = (path: string) => ({
  query: ({ id, ...data }: { id: string } & Record<string, unknown>) => ({ url: `${BASE}/orders/${id}/${path}/`, method: 'POST', data }),
  invalidatesTags: (_r: unknown, _e: unknown, { id }: { id: string }) => orderTags(id),
});

export const printingApi = api.injectEndpoints({
  endpoints: (build) => ({
    getPrintSettings: build.query<PrintShopSettings, void>({
      query: () => ({ url: `${BASE}/settings/` }),
      providesTags: ['PrintSettings'],
    }),
    updatePrintSettings: build.mutation<PrintShopSettings, Partial<PrintShopSettings>>({
      query: (data) => ({ url: `${BASE}/settings/`, method: 'PATCH', data }),
      invalidatesTags: ['PrintSettings'],
    }),
    listRateCards: build.query<PrintRateCard[], void>({
      query: () => ({ url: `${BASE}/rate-cards/` }),
      transformResponse: (data: unknown) => (Array.isArray(data) ? data : ((data as { results?: PrintRateCard[] })?.results ?? [])),
      providesTags: ['PrintRateCards'],
    }),
    saveRateCard: build.mutation<PrintRateCard, Partial<PrintRateCard>>({
      query: ({ id, ...data }) => (id ? { url: `${BASE}/rate-cards/${id}/`, method: 'PATCH', data } : { url: `${BASE}/rate-cards/`, method: 'POST', data }),
      invalidatesTags: ['PrintRateCards'],
    }),
    deleteRateCard: build.mutation<void, number>({
      query: (id) => ({ url: `${BASE}/rate-cards/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['PrintRateCards'],
    }),

    printSummary: build.query<PrintOrderSummary, void>({
      query: () => ({ url: `${BASE}/orders/summary/` }),
      providesTags: [{ type: 'PrintOrders', id: 'LIST' }],
    }),
    listPrintOrders: build.query<Paginated<PrintOrderListItem>, PrintOrderListParams>({
      query: ({ bucket, fulfilment_type, q, page }) => ({
        url: `${BASE}/orders/`,
        params: { bucket: bucket || undefined, fulfilment_type: fulfilment_type || undefined, q: q || undefined, page },
      }),
      providesTags: [{ type: 'PrintOrders', id: 'LIST' }],
    }),
    getPrintOrder: build.query<PrintOrderDetail, string>({
      query: (id) => ({ url: `${BASE}/orders/${id}/` }),
      providesTags: (_r, _e, id) => [{ type: 'PrintOrder', id }],
    }),

    acceptPrintOrder: build.mutation<PrintOrderDetail, { id: string }>(action('accept')),
    rejectPrintOrder: build.mutation<PrintOrderDetail, { id: string; reason: string }>(action('reject')),
    quotePrintOrder: build.mutation<PrintOrderDetail, { id: string; quoted_amount: string; details?: string; estimated_completion_minutes?: number | null }>(action('quote')),
    requestPrintClarification: build.mutation<PrintOrderDetail, { id: string; message: string }>(action('request-clarification')),
    setPrintStatus: build.mutation<PrintOrderDetail, { id: string; status: PrintOrderStatus; note?: string }>(action('status')),
    markPrintReady: build.mutation<PrintOrderDetail, { id: string }>(action('ready')),
    requestPrintDelivery: build.mutation<PrintOrderDetail, { id: string }>(action('request-delivery')),
    verifyPrintPickup: build.mutation<PrintOrderDetail, { id: string; code?: string; qr_payload?: string }>(action('verify-pickup')),
    handOverPrintOrder: build.mutation<PrintOrderDetail, { id: string; cash_collected?: boolean }>(action('hand-over')),
    cancelPrintOrder: build.mutation<PrintOrderDetail, { id: string; reason: string }>(action('cancel')),
    printJobAction: build.mutation<PrintOrderDetail, { id: string; jobId: number; action: 'printed' | 'failed' | 'reprint'; printer_name?: string; error?: string; reason?: string }>({
      query: ({ id, jobId, action: jobAction, ...data }) => ({ url: `${BASE}/orders/${id}/jobs/${jobId}/${jobAction}/`, method: 'POST', data }),
      invalidatesTags: (_r, _e, { id }) => orderTags(id),
    }),
    /** Counter mode: verify a pickup by code or QR without opening the order first. */
    verifyAnyPickup: build.mutation<PrintOrderDetail, { code?: string; qr_payload?: string }>({
      query: (data) => ({ url: `${BASE}/orders/verify-pickup/`, method: 'POST', data }),
      invalidatesTags: (r) => (r ? orderTags(r.id) : [{ type: 'PrintOrders', id: 'LIST' }]),
    }),
    printDocumentLink: build.mutation<PrintDocumentLink, { id: string; fileId: number; disposition: 'inline' | 'attachment' }>({
      query: ({ id, fileId, disposition }) => ({ url: `${BASE}/orders/${id}/files/${fileId}/link/`, method: 'POST', data: { disposition } }),
    }),
  }),
});

export const {
  useGetPrintSettingsQuery,
  useUpdatePrintSettingsMutation,
  useListRateCardsQuery,
  useSaveRateCardMutation,
  useDeleteRateCardMutation,
  usePrintSummaryQuery,
  useListPrintOrdersQuery,
  useGetPrintOrderQuery,
  useAcceptPrintOrderMutation,
  useRejectPrintOrderMutation,
  useQuotePrintOrderMutation,
  useRequestPrintClarificationMutation,
  useSetPrintStatusMutation,
  useMarkPrintReadyMutation,
  useRequestPrintDeliveryMutation,
  useVerifyPrintPickupMutation,
  useHandOverPrintOrderMutation,
  useCancelPrintOrderMutation,
  usePrintJobActionMutation,
  useVerifyAnyPickupMutation,
  usePrintDocumentLinkMutation,
} = printingApi;
