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
  measureText?: string | null;
}

export function MapToolbar({
  items,
  onItemClick,
  statusText,
  measureText,
}: MapToolbarProps) {
  return (
    <div className={styles.root}>
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
      {measureText && (
        <div className={styles.measure}>
          {measureText}
        </div>
      )}
    </div>
  );
}
