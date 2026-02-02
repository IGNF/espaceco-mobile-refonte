import styles from './Loading.module.css';

export type LoadingSize = 'small' | 'medium' | 'large';

export interface LoadingProps {
  size?: LoadingSize;
  label?: string;
  className?: string;
}

export function Loading({ size = 'medium', label, className }: LoadingProps) {
  const classNames = [
    styles.container,
    className ?? '',
  ].filter(Boolean).join(' ');

  return (
    <div className={classNames}>
      <span className={`${styles.spinner} ${styles[size]}`} />
      {label && <span className={styles.label}>{label}</span>}
    </div>
  );
}
