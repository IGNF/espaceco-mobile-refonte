import { useTranslation } from 'react-i18next';
import { Alert } from '@/shared/ui/Alert';
import type { DirectContributionFeatureCandidate } from '@/features/map/types/directContribution';

import styles from './DirectContributionFeatureChoiceAlert.module.css';

export interface DirectContributionFeatureChoiceAlertProps {
  isOpen: boolean;
  candidates: DirectContributionFeatureCandidate[];
  onSelectCandidate: (candidateKey: string) => void;
  onClose: () => void;
}

export function DirectContributionFeatureChoiceAlert({
  isOpen,
  candidates,
  onSelectCandidate,
  onClose,
}: DirectContributionFeatureChoiceAlertProps) {
  const { t } = useTranslation();

  return (
    <Alert
      isOpen={isOpen}
      onClose={onClose}
      title={t('layers.directContribution.objectChoice.title')}
      subtitle={t('layers.directContribution.objectChoice.subtitle', {
        count: candidates.length,
      })}
      buttons={[
        {
          label: t('layers.directContribution.objectChoice.actions.cancel'),
          onClick: onClose,
          variant: 'outline',
        },
      ]}
    >
      <div className={styles.objectChoiceList}>
        {candidates.map((candidate) => (
          <button
            key={candidate.key}
            type='button'
            className={styles.objectChoiceButton}
            onClick={() => onSelectCandidate(candidate.key)}
          >
            <span className={styles.objectChoiceLabel}>{candidate.label}</span>
            {candidate.secondaryLabel && (
              <span className={styles.objectChoiceSecondaryLabel}>
                {candidate.secondaryLabel}
              </span>
            )}
          </button>
        ))}
      </div>
    </Alert>
  );
}
