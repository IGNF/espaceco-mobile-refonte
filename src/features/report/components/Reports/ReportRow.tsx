import { useTranslation } from 'react-i18next';
import type { AppReport } from '@/domain/report/models';
import { getStatusColor } from '@/shared/utils/reportStatus';
import { formatDate, formatTime } from '@/shared/utils/date';
import IconAngleRight from '@/shared/assets/icons/icon-angle-right.svg?react';
import styles from './ReportRow.module.css';

export interface ReportRowProps {
	report: AppReport;
	communityName?: string;
	onClick?: (report: AppReport) => void;
}

export function ReportRow({ report, communityName, onClick }: ReportRowProps) {
	const { t } = useTranslation();

	const handleClick = () => {
		onClick?.(report);
	};

	const statusColor = getStatusColor(report.status);
	const themeName = report.attributes?.themeName || t('reports.groupReports.defaultTheme');

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
				{communityName && <span className={styles.community}>{communityName}</span>}
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
