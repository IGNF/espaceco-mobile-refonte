import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGroupReports } from '@/features/report/hooks/useGroupReports';
import { useCommunity } from '@/features/community/hooks/useCommunity';
import { SlideUpPage } from '@/shared/ui/SlideUpPage';
import { PageHeader } from '@/shared/ui/PageHeader';
import { ReportRow } from '@/features/report/components/Reports/ReportRow';
import type { AppReport } from '@/domain/report/models';
import IconSearch from '@/shared/assets/icons/icon-search.svg?react';
import IconFilter from '@/shared/assets/icons/icon-filter.svg?react';
import styles from './GroupReportsPage.module.css';

export interface GroupReportsPageProps {
	isOpen: boolean;
	onClose: () => void;
}

export function GroupReportsPage({ isOpen, onClose }: GroupReportsPageProps) {
	const { t } = useTranslation();
	const { activeCommunity, isLoading: isCommunityLoading } = useCommunity();
	const { reports, isLoading, error } = useGroupReports();
	const [searchQuery, setSearchQuery] = useState('');

	const handleReportClick = (report: AppReport) => {
		console.log('Report clicked - Full object:', JSON.stringify(report, null, 2));
		console.log('Report clicked - Raw:', report);
		// TODO: Navigate to report details
	};

	const handleSearch = () => {
		console.log('Search:', searchQuery);
		// TODO: Implement search
	};

	const handleFilter = () => {
		console.log('Filter clicked');
		// TODO: Open filter modal
	};

	const renderContent = () => {
		if (isCommunityLoading) {
			return <div className={styles.loading}>{t('reports.groupReports.loading')}</div>;
		}

		if (!activeCommunity) {
			return <div className={styles.empty}>{t('reports.groupReports.noCommunitySelected')}</div>;
		}

		if (isLoading) {
			return <div className={styles.loading}>{t('reports.groupReports.loadingReports')}</div>;
		}

		if (error) {
			return <div className={styles.error}>{t('reports.groupReports.error')}: {error.message}</div>;
		}

		return (
			<>
				<p className={styles.count}>
					<strong>{reports.length}</strong> {reports.length === 1 ? t('reports.groupReports.report_singular') : t('reports.groupReports.report_plural')}
				</p>
				<div className={styles.reportList}>
					{reports.map((report) => (
						<ReportRow
							key={report.id}
							report={report}
							onClick={handleReportClick}
						/>
					))}
				</div>
			</>
		);
	};

	return (
		<SlideUpPage isOpen={isOpen} onClose={onClose}>
			<PageHeader
				title={t('reports.groupReports.headerTitle')}
				subtitle={t('reports.groupReports.headerSubtitle')}
				onClose={onClose}
			/>

			<main className={styles.content}>
				<div className={styles.titleSection}>
					<h1 className={styles.mainTitle}>{t('reports.groupReports.title')}</h1>
					<p className={styles.subtitle}>
						{t('reports.groupReports.description')} {activeCommunity?.name || ''}
					</p>
				</div>

				<div className={styles.searchSection}>
					<div className={styles.searchBar}>
						<input
							type="text"
							className={styles.searchInput}
							placeholder={`${t('reports.filters.search')}...`}
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
						<button
							className={styles.searchButton}
							onClick={handleSearch}
							aria-label={t('reports.filters.search')}
						>
							<IconSearch className={styles.searchIcon} />
						</button>
					</div>
					<button
						className={styles.filterButton}
						onClick={handleFilter}
						aria-label={t('reports.filters.filter')}
					>
						<IconFilter className={styles.filterIcon} />
						<span className={styles.filterLabel}>{t('reports.filters.filter')}</span>
					</button>
				</div>

				{renderContent()}
			</main>
		</SlideUpPage>
	);
}
