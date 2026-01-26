import type { ReportStatus } from '@ign/mobile-core';
import type { AppReport } from './models';

export interface ApiReportResponse {
  id: number;
  community_id: number;
  theme_id: number;
  geometry: string;
  comment: string;
  attributes?: Record<string, any>;
  status: string;
  created_at: string;
  modified_at?: string;
  user_id?: number;
}

export function mapApiReportToAppReport(apiReport: ApiReportResponse): AppReport {
  return {
    id: apiReport.id,
    communityId: apiReport.community_id,
    themeId: apiReport.theme_id,
    geometry: apiReport.geometry,
    comment: apiReport.comment,
    attributes: apiReport.attributes,
    status: apiReport.status as ReportStatus,
    createdAt: new Date(apiReport.created_at),
    modifiedAt: apiReport.modified_at ? new Date(apiReport.modified_at) : undefined,
    userId: apiReport.user_id,
  };
}

export function mapApiReportsToAppReports(apiReports: ApiReportResponse[]): AppReport[] {
  return apiReports.map(mapApiReportToAppReport);
}
