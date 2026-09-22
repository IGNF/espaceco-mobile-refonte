import { ClosedReportStatus, ReportStatus } from "@ign/mobile-core";

export const MAX_DRAFT_REPORTS_WARNING = 40;
export const MAX_DRAFT_REPORTS_BLOCK = 80;

export const NON_SELECTABLE_LAYER_NAMES = new Set(['MesSignalements', 'Croquis', 'Signalements']);
export const MAX_REPORT_PHOTOS = 4;

export const CLOSED_STATUSES = Object.values(ClosedReportStatus) as string[];

export const ALL_REPLY_STATUS_OPTIONS: ReportStatus[] = [
  ReportStatus.Submit,
  ReportStatus.Pending,
  ReportStatus.Pending_Qualification,
  ReportStatus.Pending_Entry,
  ReportStatus.Pending_Validation,
  ReportStatus.Valid,
  ReportStatus.Valid_Already_Treated,
  ReportStatus.Reject,
  ReportStatus.Reject_Irrelevant,
];