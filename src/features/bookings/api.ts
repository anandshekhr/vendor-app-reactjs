import { api } from '@/services/api';
import { normalizePage, type Paginated } from '@/services/api/pagination';
import type { BookingAction, BookingDetail, BookingListItem } from '@/types/api';

export const bookingsApi = api.injectEndpoints({
  endpoints: (build) => ({
    listBookings: build.query<Paginated<BookingListItem>, { status?: string; q?: string; page?: number }>({
      query: ({ status = 'all', q, page = 1 }) => ({ url: '/vendor/dashboard/api/bookings/', params: { status, q, page } }),
      transformResponse: (data: unknown) => normalizePage<BookingListItem>(data),
      providesTags: [{ type: 'Bookings', id: 'LIST' }],
    }),
    pollBookings: build.query<{ bookings: BookingListItem[]; latest_id: number }, number>({
      query: (since) => ({ url: '/vendor/dashboard/api/bookings/poll/', params: { since } }),
    }),
    getBooking: build.query<BookingDetail, number>({
      query: (id) => `/vendor/dashboard/api/bookings/${id}/`,
      providesTags: (_r, _e, id) => [{ type: 'Bookings', id }],
    }),
    bookingAction: build.mutation<BookingDetail, { id: number; action: BookingAction; start_time?: string; end_time?: string }>({
      query: ({ id, ...data }) => ({ url: `/vendor/dashboard/api/bookings/${id}/action/`, method: 'POST', data }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Bookings', id }, { type: 'Bookings', id: 'LIST' }, 'ServiceDashboard'],
    }),
  }),
});

export const { useListBookingsQuery, useGetBookingQuery, useBookingActionMutation, useLazyPollBookingsQuery } = bookingsApi;
