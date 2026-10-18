import { api } from '@/services/api';
import type { DeliveryPartner } from '@/types/api';

export const deliveryApi = api.injectEndpoints({
  endpoints: (build) => ({
    nearbyPartners: build.query<DeliveryPartner[], { latitude: number; longitude: number; radius_km?: number }>({
      query: (params) => ({ url: '/api/v2/delivery/nearby-partners/', params }),
    }),
    assignPartner: build.mutation<{ assignment_id: number; status: string }, { vendorOrderId: number; partnerId: string; notes?: string }>({
      query: ({ vendorOrderId, partnerId, notes = '' }) => ({
        url: `/api/v2/o/vendor-orders/${vendorOrderId}/assign-delivery/`,
        method: 'POST',
        data: { delivery_partner_id: partnerId, notes },
      }),
      invalidatesTags: (_r, _e, { vendorOrderId }) => [{ type: 'Order', id: vendorOrderId }, { type: 'Orders', id: 'LIST' }],
    }),
  }),
});

export const { useLazyNearbyPartnersQuery, useAssignPartnerMutation } = deliveryApi;
