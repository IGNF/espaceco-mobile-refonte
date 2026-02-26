import { useState, type ComponentType, type ReactNode } from 'react';
import { Button } from '@/shared/ui/Button';
import IconAngleDown from '@/shared/assets/icons/icon-angle-down.svg?react';
import styles from './AttachmentSection.module.css';

interface AttachmentSectionAction {
  label: string;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export interface AttachmentSectionProps {
  Icon: ComponentType<{ className?: string }>;
  label: string;
  badge: string;
  hasContent: boolean;
  emptyText: string;
  action?: AttachmentSectionAction;
  children?: ReactNode;
}

export function AttachmentSection({
  Icon,
  label,
  badge,
  hasContent,
  emptyText,
  action,
  children,
}: AttachmentSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded((previousValue) => !previousValue);
  };

  return (
    <div className={styles.section}>
      <button
        type="button"
        className={styles.headerButton}
        onClick={toggleExpanded}
        aria-expanded={isExpanded}
      >
        <div className={styles.title}>
          <Icon className={styles.icon} />
          <span className={styles.label}>{label}</span>
        </div>

        <div className={styles.headerRight}>
          <span className={styles.badge}>{badge}</span>
          <IconAngleDown
            className={`${styles.chevron} ${isExpanded ? styles.chevronExpanded : ''}`}
            aria-hidden="true"
          />
        </div>
      </button>

      {isExpanded && (
        <>
          {hasContent ? (
            children
          ) : (
            <div className={styles.emptyState}>
              <Icon className={styles.emptyIcon} />
              <span className={styles.emptyText}>{emptyText}</span>
            </div>
          )}

          {action && (
            <Button
              type="button"
              color="primary"
              variant="outline"
              onClick={action.onClick}
              loading={action.loading}
              disabled={action.disabled}
              className={styles.action}
            >
              {action.label}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
