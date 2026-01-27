import { ReportStatus } from '@ign/mobile-core';

/**
 * Maps report status to CSS variable color names
 * Groups similar statuses to use the same color family
 */
export const STATUS_COLOR_MAP: Record<ReportStatus, string> = {
	// Pending statuses - Warning/Orange
	[ReportStatus.Pending]: 'var(--color-warning)',
	[ReportStatus.Pending_Qualification]: 'var(--color-warning)',
	[ReportStatus.Pending_Entry]: 'var(--color-warning-shade)',
	[ReportStatus.Pending_Validation]: 'var(--color-warning-tint)',

	// Valid statuses - Primary/Green
	[ReportStatus.Valid]: 'var(--color-primary)',
	[ReportStatus.Valid_Already_Treated]: 'var(--color-primary-shade)',

	// Reject statuses - Danger/Red
	[ReportStatus.Reject]: 'var(--color-danger)',
	[ReportStatus.Reject_Irrelevant]: 'var(--color-danger-shade)',

	// Submit - Secondary/Blue
	[ReportStatus.Submit]: 'var(--color-secondary)',

	// Cluster - Medium/Gray
	[ReportStatus.Cluster]: 'var(--color-medium)',
};

/**
 * Returns the CSS color variable for a given report status
 * Falls back to medium gray if status is unknown
 */
export function getStatusColor(status: ReportStatus): string {
	return STATUS_COLOR_MAP[status] || 'var(--color-medium)';
}
