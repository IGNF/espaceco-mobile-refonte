import styles from './MetricSparkline.module.css';

interface MetricSparklineProps {
  label: string;
  values: Array<number | null | undefined>;
  unit: string;
  current: string;
}

export function MetricSparkline({ label, values, unit, current }: MetricSparklineProps) {
  const numbers = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  const width = 160;
  const height = 36;
  const min = numbers.length > 0 ? Math.min(...numbers) : 0;
  const max = numbers.length > 0 ? Math.max(...numbers) : 1;
  const span = max - min || 1;
  const points = numbers
    .map((value, index) => {
      const x = numbers.length === 1 ? 0 : (index / (numbers.length - 1)) * width;
      const y = height - ((value - min) / span) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <article className={styles.card}>
      <div className={styles.header}>
        <span className={styles.label}>{label}</span>
        <strong className={styles.value}>{current}</strong>
      </div>
      {numbers.length > 1 ? (
        <svg className={styles.chart} viewBox={`0 0 ${width} ${height}`} aria-hidden='true'>
          <polyline
            className={styles.line}
            fill='none'
            strokeWidth='2'
            points={points}
          />
        </svg>
      ) : (
        <p className={styles.empty}>En attente de données</p>
      )}
      <span className={styles.range}>
        {numbers.length > 0 ? `${min.toFixed(1)} – ${max.toFixed(1)} ${unit}` : `n/d ${unit}`}
      </span>
    </article>
  );
}
