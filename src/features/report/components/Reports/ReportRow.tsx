import { useTranslation } from 'react-i18next';
import { ReportStatus } from '@ign/mobile-core';
import type { AppReport } from '@/domain/report/models';
import IconAngleRight from '@/shared/assets/icons/icon-angle-right.svg?react';
import styles from './ReportRow.module.css';

export interface ReportRowProps {
	report: AppReport;
	onClick?: (report: AppReport) => void;
}

/**
 * Maps report status to CSS variable color names
 * Groups similar statuses to use the same color family
 */
const STATUS_COLOR_MAP: Record<ReportStatus, string> = {
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

function getStatusColor(status: ReportStatus): string {
	return STATUS_COLOR_MAP[status] || 'var(--color-medium)';
}

function formatDate(date: Date): string {
	return date.toLocaleDateString('fr-FR', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
	});
}

function formatTime(date: Date): string {
	return date.toLocaleTimeString('fr-FR', {
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	});
}

export function ReportRow({ report, onClick }: ReportRowProps) {
	const { t } = useTranslation();

	const handleClick = () => {
		onClick?.(report);
	};

	const statusColor = getStatusColor(report.status);
	const themeName = report.extraData?.themeName || report.attributes?.themeName || t('reports.groupReports.defaultTheme');

	return (
		<button className={styles.row} onClick={handleClick} type="button">
			<div
				className={styles.statusIndicator}
				style={{ backgroundColor: statusColor }}
				aria-label={`Status: ${report.status}`}
			/>
			<div className={styles.content}>
				<span className={styles.title}>
					{t('reports.groupReports.reportNumber')}{report.id}
				</span>
				<span className={styles.theme}>{themeName}</span>
				<div className={styles.dateTime}>
					<span className={styles.date}>{formatDate(report.createdAt)}</span>
					<span className={styles.time}>{formatTime(report.createdAt)}</span>
				</div>
			</div>
			<IconAngleRight className={styles.chevron} />
		</button>
	);
}
