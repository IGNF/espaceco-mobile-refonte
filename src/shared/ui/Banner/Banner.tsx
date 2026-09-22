import { useState } from 'react';
import { joinCSSClassNames } from '@/shared/utils/join';
import IconClose from '@/shared/assets/icons/icon-close.svg?react';
import styles from './Banner.module.css';

export type BannerColor =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'light'
  | 'medium'
  | 'dark';

export interface BannerProps {
  title: string;
  message: string;
  color?: BannerColor;
  canBeClosed?: boolean;
}

export function Banner({
  title,
  message,
  color = 'primary',
  canBeClosed = false,
}: BannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div
      className={joinCSSClassNames(styles.banner, styles[color])}
      role="status"
    >
      <div className={styles.content}>
        <p className={styles.title}>{title}</p>
        <p className={styles.message}>{message}</p>
      </div>
      {canBeClosed && (
        <button
          type="button"
          className={styles.closeButton}
          onClick={() => setIsVisible(false)}
          aria-label="Close"
        >
          <IconClose className={styles.closeIcon} />
        </button>
      )}
    </div>
  );
}
