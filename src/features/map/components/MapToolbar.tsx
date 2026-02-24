import type { ComponentType } from 'react';
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

function cx(...classNames: Array<string | undefined | false>): string {
  return classNames.filter(Boolean).join(' ');
}

export function MapToolbar({
  items,
  onItemClick,
  statusText,
  className,
}: MapToolbarProps) {
  return (
    <div className={cx(styles.root, className)}>
      <div className={styles.toolbar}>
        {items.map(({ id, Icon, label, active, disabled }) => (
          <button
            key={id}
            type="button"
            className={cx(styles.toolButton, active && styles.toolButtonActive)}
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
