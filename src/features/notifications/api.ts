import { api } from '@/services/api';
import type { ServerNotificationList, ServerNotification } from '@/types/api';

/** The server's notification centre (GET /vendor/dashboard/api/notifications/). */
export const notificationsApi = api.injectEndpoints({
  endpoints: (build) => ({
    listServerNotifications: build.query<ServerNotificationList, { page?: number; unread?: boolean }>({
      query: ({ page = 1, unread }) => ({ url: '/vendor/dashboard/api/notifications/', params: { page, unread: unread ? 1 : undefined } }),
      providesTags: ['Notifications'],
    }),
    markNotificationRead: build.mutation<ServerNotification, number>({
      query: (id) => ({ url: `/vendor/dashboard/api/notifications/${id}/read/`, method: 'POST' }),
      invalidatesTags: ['Notifications'],
    }),
    markAllNotificationsRead: build.mutation<{ marked_read: number }, void>({
      query: () => ({ url: '/vendor/dashboard/api/notifications/read-all/', method: 'POST' }),
      invalidatesTags: ['Notifications'],
    }),
  }),
});

export const { useListServerNotificationsQuery, useMarkNotificationReadMutation, useMarkAllNotificationsReadMutation } = notificationsApi;
