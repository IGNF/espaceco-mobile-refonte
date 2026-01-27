import { useTranslation } from 'react-i18next';
import { SlideUpPage } from '@/shared/ui/SlideUpPage';
import { PageHeader } from '@/shared/ui/PageHeader';
import type { AppReport } from '@/domain/report/models';
import { useCommunity } from '@/features/community/hooks/useCommunity';
import { getStatusColor } from '@/shared/utils/reportStatus';
import { formatDateTime } from '@/shared/utils/date';
import { parsePointGeometry } from '@/shared/utils/geometry';

import { Button } from '@/shared/ui/Button';

import styles from './ReportDetailsPage.module.css';
import screen from '@/shared/styles/screen.module.css';
import typography from '@/shared/styles/typography.module.css';
export interface ReportDetailsPageProps {
  isOpen: boolean;
  report: AppReport | null;
  onClose: () => void;
  onBack: () => void;
}

export function ReportDetailsPage({ isOpen, report, onClose, onBack }: ReportDetailsPageProps) {
  const { t } = useTranslation();
  const { activeCommunity } = useCommunity();

  const handleRespond = () => {
    console.log('Respond to report:', report?.id);
  };

  if (!report) {
    return null;
  }

  console.log('ReportDetailsPage => report', report);

  const statusColor = getStatusColor(report.status);
  const statusLabel = t(`reports.status.${report.status}`, report.status);
  const position = parsePointGeometry(report.geometry);
  const themeName = report.attributes?.themeName || t('reports.details.notAvailable');
  const communeName = report.commune?.title || t('reports.details.notAvailable');
  const departmentName = report.departement?.name || t('reports.details.notAvailable');
  const authorName = report.author?.username || t('reports.details.notAvailable');
  const responses = report.replies || [];

  // Format attributes for display
  // TODO: Implement this - look at how it's done in the previous app
  const formatAttributes = (): string | null => {
    return '';
    // if (!report.attributes?.raw || !Array.isArray(report.attributes.raw)) return null;
    // const attrs = report.attributes.raw[0]?.attributes;
    // console.log('formatAttributes => attrs', attrs);
    // if (!attrs || attrs.length === 0) return null;
    // return attrs.map((attr: any) => `${attr.name}: ${attr.value}`).join(', ');
  };

  const attributesText = formatAttributes();

  return (
    <SlideUpPage isOpen={isOpen} onClose={onClose} level={2}>
      <PageHeader
        title={t('reports.details.headerTitle')}
        subtitle={t('reports.details.headerSubtitle')}
        showBackButton
        onBack={onBack}
        onClose={onClose}
      />

      <main className={screen.screenContainer + " " + styles.content}>
        <div className={styles.titleSection}>
          <h1 className={typography.title}>{t('reports.details.title')}</h1>
          <p className={typography.subtitle}>
            {t('reports.details.subtitle')}{report.id}
          </p>
        </div>

        <div className={styles.detailsTable}>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>{t('reports.details.identifier')} :</span>
            <span className={styles.detailValue}>#{report.id}</span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>{t('reports.details.status')} :</span>
            <span className={styles.detailValue}>
              <span
                className={styles.statusIndicator}
                style={{ backgroundColor: statusColor }}
              />
              {statusLabel}
            </span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>{t('reports.details.group')} :</span>
            <span className={styles.detailValue}>{activeCommunity?.name || t('reports.details.notAvailable')}</span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>{t('reports.details.author')} :</span>
            <span className={styles.detailValue}>{authorName}</span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>{t('reports.details.theme')} :</span>
            <span className={styles.detailValue}>{themeName}</span>
          </div>

          {attributesText && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t('reports.details.attributes')} :</span>
              <span className={styles.detailValue}>{attributesText}</span>
            </div>
          )}

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>{t('reports.details.date')} :</span>
            <span className={styles.detailValue}>{formatDateTime(report.createdAt)}</span>
          </div>

          {position && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t('reports.details.position')} :</span>
              <span className={styles.detailValue}>{position.lon.toFixed(6)}, {position.lat.toFixed(6)}</span>
            </div>
          )}

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>{t('reports.details.commune')} :</span>
            <span className={styles.detailValue}>{communeName}</span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>{t('reports.details.department')} :</span>
            <span className={styles.detailValue}>{departmentName}</span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>{t('reports.details.comment')} :</span>
            <span className={styles.detailValue}>{report.comment || t('reports.details.notAvailable')}</span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>{t('reports.details.responses')} :</span>
            <span className={styles.detailValue}>
              {responses.length > 0
                ? `${responses.length} réponse(s)`
                : t('reports.details.noResponses')}
            </span>
          </div>
        </div>

        <div className={styles.buttonContainer}>
          <Button color="primary" onClick={handleRespond}>
            {t('reports.details.respondButton')}
          </Button>

        </div>
      </main>
    </SlideUpPage>
  );
}
