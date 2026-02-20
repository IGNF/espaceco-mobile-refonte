import type { ComponentType, ReactNode } from 'react';
import { Button } from '@/shared/ui/Button';
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
  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <div className={styles.title}>
          <Icon className={styles.icon} />
          <span className={styles.label}>{label}</span>
        </div>

        <span className={styles.badge}>{badge}</span>
      </div>

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
    </div>
  );
}
