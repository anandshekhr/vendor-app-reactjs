import { api } from '@/services/api';
import type { DashboardResponse, ServiceDashboardResponse } from '@/types/api';

export const dashboardApi = api.injectEndpoints({
  endpoints: (build) => ({
    getDashboard: build.query<DashboardResponse, void>({
      query: () => '/vendor/dashboard/api/dashboard/',
      providesTags: ['Dashboard'],
    }),
    getServiceDashboard: build.query<ServiceDashboardResponse, void>({
      query: () => '/api/v2/vendors/service-dashboard/',
      providesTags: ['ServiceDashboard'],
    }),
  }),
});

export const { useGetDashboardQuery, useGetServiceDashboardQuery } = dashboardApi;
