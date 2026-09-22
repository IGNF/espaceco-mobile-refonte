import { Alert } from '@/shared/ui/Alert';

import styles from './FeatureChoiceAlert.module.css';

export interface FeatureChoiceItem {
  key: string;
  label: string;
  secondaryLabel?: string;
}

export interface FeatureChoiceAlertProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  cancelLabel: string;
  candidates: FeatureChoiceItem[];
  onSelectCandidate: (candidateKey: string) => void;
  onClose: () => void;
}

export function FeatureChoiceAlert({
  isOpen,
  title,
  subtitle,
  cancelLabel,
  candidates,
  onSelectCandidate,
  onClose,
}: FeatureChoiceAlertProps) {
  return (
    <Alert
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      buttons={[
        {
          label: cancelLabel,
          onClick: onClose,
          variant: 'outline',
          color: 'medium',
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
