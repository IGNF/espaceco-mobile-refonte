import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor';
import { formatElapsed, formatPercent } from '../utils/formatMetrics';
import styles from './PerformanceMonitorBadge.module.css';

interface PerformanceMonitorBadgeProps {
  onOpen: () => void;
}

export function PerformanceMonitorBadge({ onOpen }: PerformanceMonitorBadgeProps) {
  const { isMonitoring, latestSample } = usePerformanceMonitor();
  const elapsed = latestSample?.elapsedMs ?? 0;

  return (
    <button
      type='button'
      className={`${styles.badge} ${isMonitoring ? styles.active : ''}`}
      onClick={onOpen}
    >
      <span className={styles.dot} />
      <span className={styles.text}>
        {isMonitoring ? 'Perf' : 'Perf off'}
        {isMonitoring && (
          <>
            {' · '}
            {formatPercent(latestSample?.cpu?.usagePercent ?? null)}
            {' · '}
            {formatElapsed(elapsed)}
          </>
        )}
      </span>
    </button>
  );
}
