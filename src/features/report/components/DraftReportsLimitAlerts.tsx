import { useTranslation } from 'react-i18next';

import type { UseDraftReportsLimitGuardReturn } from '@/features/report/hooks/useDraftReportsLimitGuard';
import { MAX_DRAFT_REPORTS_BLOCK } from '@/shared/constants/report';
import { Alert } from '@/shared/ui/Alert';

export function DraftReportsLimitAlerts({
  alertType,
  draftCount,
  confirmWarning,
  dismissAlert,
}: UseDraftReportsLimitGuardReturn) {
  const { t } = useTranslation();

  return (
    <>
      <Alert
        isOpen={alertType === 'warning'}
        title={t('reportsLimitReached.alert.warning.title')}
        subtitle={t('reportsLimitReached.alert.warning.subtitle', {
          count: draftCount,
          limit: MAX_DRAFT_REPORTS_BLOCK,
        })}
        onClose={dismissAlert}
        buttons={[
          {
            label: t('reportsLimitReached.alert.warning.button'),
            color: 'primary',
            onClick: confirmWarning,
          },
          {
            label: t('reportsLimitReached.alert.warning.cancel'),
            color: 'medium',
            onClick: dismissAlert,
          },
        ]}
      />
      <Alert
        isOpen={alertType === 'error'}
        title={t('reportsLimitReached.alert.error.title')}
        subtitle={t('reportsLimitReached.alert.error.subtitle', {
          limit: MAX_DRAFT_REPORTS_BLOCK,
        })}
        onClose={dismissAlert}
        buttons={[
          {
            label: t('reportsLimitReached.alert.error.button'),
            color: 'primary',
            onClick: dismissAlert,
          },
        ]}
      />
    </>
  );
}
