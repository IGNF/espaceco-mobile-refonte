import type { HTMLAttributes, ReactNode } from 'react';
import type { ButtonColor } from '@/shared/ui/Button';
import { joinCSSClassNames } from '@/shared/utils/join';
import styles from './Badge.module.css';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  color?: ButtonColor;
}

export function Badge({
  children,
  color = 'primary',
  className,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={joinCSSClassNames(styles.badge, styles[color], className)}
      {...rest}
    >
      {children}
    </span>
  );
}
