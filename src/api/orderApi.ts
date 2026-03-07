import { apiClient } from './client';
import {
  Order,
  OrderStatus,
  DeliveryPartner,
} from '../models/types';

interface OrderListResponse {
  orders: Order[];
  total: number;
  page: number;
}

export const orderApi = {
  getOrders: (params?: { status?: OrderStatus; page?: number; limit?: number }): Promise<OrderListResponse> =>
    apiClient.get('/vendor/orders', { params }),

  getOrderById: (id: string): Promise<Order> =>
    apiClient.get(`/vendor/orders/${encodeURIComponent(id)}`),

  updateOrderStatus: (id: string, status: OrderStatus): Promise<Order> =>
    apiClient.patch(`/vendor/orders/${encodeURIComponent(id)}/status`, { status }),

  acceptOrder: (id: string): Promise<Order> =>
    apiClient.post(`/vendor/orders/${encodeURIComponent(id)}/accept`),

  rejectOrder: (id: string, reason?: string): Promise<Order> =>
    apiClient.post(`/vendor/orders/${encodeURIComponent(id)}/reject`, { reason }),

  markReadyForPickup: (id: string): Promise<Order> =>
    apiClient.post(`/vendor/orders/${encodeURIComponent(id)}/ready`),

  getDeliveryPartners: (): Promise<DeliveryPartner[]> =>
    apiClient.get('/vendor/delivery-partners'),

  assignDeliveryPartner: (orderId: string, partnerId: string): Promise<Order> =>
    apiClient.post(`/vendor/orders/${encodeURIComponent(orderId)}/assign-delivery`, { partnerId }),

  autoAssignDelivery: (orderId: string): Promise<Order> =>
    apiClient.post(`/vendor/orders/${encodeURIComponent(orderId)}/auto-assign`),

  searchOrders: (query: string): Promise<OrderListResponse> =>
    apiClient.get('/vendor/orders/search', { params: { q: query } }),
};
