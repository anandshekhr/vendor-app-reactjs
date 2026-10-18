import { apiClient } from './client';
import {
  DashboardStats,
  AnalyticsData,
  VendorPlan,
  VendorSubscription,
  AppNotification,
} from '../models/types';

export const dashboardApi = {
  getStats: (): Promise<DashboardStats> =>
    apiClient.get('/vendor/dashboard/stats'),
};

export const analyticsApi = {
  getAnalytics: (period?: 'daily' | 'weekly' | 'monthly'): Promise<AnalyticsData> =>
    apiClient.get('/vendor/analytics', { params: { period } }),
};

export const planApi = {
  getPlans: (): Promise<VendorPlan[]> =>
    apiClient.get('/plans'),

  getCurrentSubscription: (): Promise<VendorSubscription> =>
    apiClient.get('/vendor/subscription'),

  purchasePlan: (planId: string, paymentId: string): Promise<VendorSubscription> =>
    apiClient.post('/vendor/subscription/purchase', { planId, paymentId }),
};

export const notificationApi = {
  getNotifications: (params?: { page?: number }): Promise<{ notifications: AppNotification[]; total: number }> =>
    apiClient.get('/vendor/notifications', { params }),

  markAsRead: (id: string): Promise<void> =>
    apiClient.patch(`/vendor/notifications/${encodeURIComponent(id)}/read`),

  markAllAsRead: (): Promise<void> =>
    apiClient.post('/vendor/notifications/mark-all-read'),
};
