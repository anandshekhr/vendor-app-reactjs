import { api } from '@/services/api';
import type { ReportSummary } from '@/types/api';

export const reportsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getReportSummary: build.query<ReportSummary, { from: string; to: string }>({
      query: (range) => ({ url: '/vendor/dashboard/api/reports/summary/', params: range }),
      providesTags: ['Reports'],
    }),
  }),
});

export const { useGetReportSummaryQuery } = reportsApi;
