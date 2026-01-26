import type { Report, ReportStatus } from '@ign/mobile-core';

export interface AppReport extends Report {
  extraData?: Record<string, any>;
}

// Params to send along with the request to the API
export interface ReportListRequestParams {
  communityId: number;
  page?: number;
  limit?: number;
  status?: ReportStatus[];
  themeIds?: number[];
}

// Result from the API response
export interface ReportListResult {
  reports: AppReport[];
  total: number;
  page: number;
  limit: number;
}
