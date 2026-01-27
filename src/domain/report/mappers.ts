import type { ReportStatus } from '@ign/mobile-core';
import type { AppReport } from './models';

/**
 * Author/User info from API
 */
export interface ApiAuthor {
  id: number;
  username: string;
}

/**
 * Location info (commune, departement, territory)
 */
export interface ApiLocation {
  name: string;
  title: string;
  type: {
    name: string;
    title: string;
  };
  deleted?: boolean;
  extent?: number[];
}

/**
 * Theme attribute from API
 */
export interface ApiThemeAttribute {
  community: number;
  theme: string;
  attributes: any[];
}

/**
 * Reply from API
 */
export interface ApiReply {
  id: number;
  author: ApiAuthor;
  title: string;
  // ... other fields
}

/**
 * Full API response for a report
 */
export interface ApiReportResponse {
  id: number;
  community: number;
  geometry: string;
  comment: string;
  attributes?: ApiThemeAttribute[];
  status: string;
  opening_date: string;
  updating_date?: string;
  closing_date?: string;
  author?: ApiAuthor;
  validator?: ApiAuthor;
  commune?: ApiLocation;
  departement?: ApiLocation;
  territory?: ApiLocation;
  device_version?: string;
  input_device?: string;
  sketch?: string;
  sketch_xml?: string;
  replies?: ApiReply[];
  attachments?: any[];
}

/**
 * Extract theme name from attributes array
 */
function extractThemeName(attributes?: ApiThemeAttribute[]): string | undefined {
  if (!attributes || attributes.length === 0) return undefined;
  return attributes[0]?.theme;
}

/**
 * Extract theme ID (community) from attributes array
 * Note: The API puts theme info in attributes[0].community
 */
function extractThemeId(attributes?: ApiThemeAttribute[]): number {
  if (!attributes || attributes.length === 0) return 0;
  return attributes[0]?.community || 0;
}

export function mapApiReportToAppReport(apiReport: ApiReportResponse): AppReport {
  const themeName = extractThemeName(apiReport.attributes);

  return {
    id: apiReport.id,
    communityId: apiReport.community,
    themeId: extractThemeId(apiReport.attributes),
    geometry: apiReport.geometry,
    comment: apiReport.comment,
    attributes: apiReport.attributes ? {
      raw: apiReport.attributes,
      themeName,
    } : undefined,
    status: apiReport.status as ReportStatus,
    createdAt: apiReport.opening_date ? new Date(apiReport.opening_date) : new Date(),
    modifiedAt: apiReport.updating_date ? new Date(apiReport.updating_date) : undefined,
    userId: apiReport.author?.id,
    sketch: apiReport.sketch,
    // Extra data not in the core Report interface
    extraData: {
      author: apiReport.author,
      validator: apiReport.validator,
      closingDate: apiReport.closing_date ? new Date(apiReport.closing_date) : undefined,
      commune: apiReport.commune,
      departement: apiReport.departement,
      territory: apiReport.territory,
      deviceVersion: apiReport.device_version,
      inputDevice: apiReport.input_device,
      sketchXml: apiReport.sketch_xml,
      replies: apiReport.replies,
      attachments: apiReport.attachments,
      themeName,
    },
  };
}

export function mapApiReportsToAppReports(apiReports: ApiReportResponse[]): AppReport[] {
  return apiReports.map(mapApiReportToAppReport);
}
