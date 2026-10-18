import { apiClient } from './client';
import {
  ProductSubscription,
  SubscriptionDelivery,
  SubscriptionStats,
  SubscriptionSettings,
  SubscriptionStatus,
} from '../models/types';

interface SubscriptionListResponse {
  subscriptions: ProductSubscription[];
  total: number;
  page: number;
}

interface DeliveryListResponse {
  deliveries: SubscriptionDelivery[];
  total: number;
}

export const subscriptionApi = {
  getSubscriptions: (params?: {
    status?: SubscriptionStatus;
    page?: number;
    limit?: number;
  }): Promise<SubscriptionListResponse> =>
    apiClient.get('/vendor/subscriptions', { params }),

  getSubscriptionById: (id: string): Promise<ProductSubscription> =>
    apiClient.get(`/vendor/subscriptions/${encodeURIComponent(id)}`),

  getStats: (): Promise<SubscriptionStats> =>
    apiClient.get('/vendor/subscriptions/stats'),

  getTodayDeliveries: (): Promise<DeliveryListResponse> =>
    apiClient.get('/vendor/subscriptions/today-deliveries'),

  getUpcomingDeliveries: (date?: string): Promise<DeliveryListResponse> =>
    apiClient.get('/vendor/subscriptions/upcoming-deliveries', { params: { date } }),

  pauseSubscription: (id: string): Promise<ProductSubscription> =>
    apiClient.post(`/vendor/subscriptions/${encodeURIComponent(id)}/pause`),

  resumeSubscription: (id: string): Promise<ProductSubscription> =>
    apiClient.post(`/vendor/subscriptions/${encodeURIComponent(id)}/resume`),

  cancelSubscription: (id: string, reason?: string): Promise<ProductSubscription> =>
    apiClient.post(`/vendor/subscriptions/${encodeURIComponent(id)}/cancel`, { reason }),

  skipDelivery: (id: string, deliveryDate: string): Promise<ProductSubscription> =>
    apiClient.post(`/vendor/subscriptions/${encodeURIComponent(id)}/skip`, { deliveryDate }),

  rescheduleDelivery: (id: string, fromDate: string, toDate: string): Promise<ProductSubscription> =>
    apiClient.post(`/vendor/subscriptions/${encodeURIComponent(id)}/reschedule`, { fromDate, toDate }),

  updateQuantity: (id: string, quantity: number): Promise<ProductSubscription> =>
    apiClient.patch(`/vendor/subscriptions/${encodeURIComponent(id)}/quantity`, { quantity }),

  assignDeliveryPartner: (deliveryId: string, partnerId: string): Promise<SubscriptionDelivery> =>
    apiClient.post(`/vendor/subscription-deliveries/${encodeURIComponent(deliveryId)}/assign`, { partnerId }),

  markDelivered: (deliveryId: string): Promise<SubscriptionDelivery> =>
    apiClient.post(`/vendor/subscription-deliveries/${encodeURIComponent(deliveryId)}/delivered`),

  getSettings: (): Promise<SubscriptionSettings> =>
    apiClient.get('/vendor/subscription-settings'),

  updateSettings: (data: Partial<SubscriptionSettings>): Promise<SubscriptionSettings> =>
    apiClient.put('/vendor/subscription-settings', data),
};
