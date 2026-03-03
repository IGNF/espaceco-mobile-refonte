import type { ComponentType } from 'react';
import { joinCSSClassNames } from '@/shared/utils/join';
import styles from './MapToolbar.module.css';

export interface MapToolbarItem {
  id: string;
  Icon: ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  disabled?: boolean;
}

export interface MapToolbarProps {
  items: MapToolbarItem[];
  onItemClick: (id: string) => void;
  statusText?: string;
  className?: string;
}

export function MapToolbar({
  items,
  onItemClick,
  statusText,
  className,
}: MapToolbarProps) {
  return (
    <div className={joinCSSClassNames(styles.root, className)}>
      <div className={styles.toolbar}>
        {items.map(({ id, Icon, label, active, disabled }) => (
          <button
            key={id}
            type="button"
            className={joinCSSClassNames(styles.toolButton, active && styles.toolButtonActive)}
            onClick={() => onItemClick(id)}
            aria-label={label}
            disabled={disabled}
          >
            <Icon className={styles.toolIcon} />
          </button>
        ))}
      </div>
      {statusText && (
        <div className={styles.status}>
          {statusText}
        </div>
      )}
    </div>
  );
}
