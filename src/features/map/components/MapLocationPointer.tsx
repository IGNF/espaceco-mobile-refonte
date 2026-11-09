import styles from './MapLocationPointer.module.css';
import IconAdd from '@/shared/assets/icons/icon-add.svg?react';

interface MapLocationPointerProps {
  /**
   * crosshair stays at the center of its container while aiming.
   * marker is a fixed box anchored by a map overlay.
   */
  variant?: 'crosshair' | 'marker';
}

export function MapLocationPointer({ variant = 'crosshair' }: MapLocationPointerProps) {
  return (
    <div
      className={variant === 'marker' ? styles.locationMarker : styles.locationTarget}
      aria-hidden="true"
    >
      <IconAdd className={styles.locationTargetIcon} />
    </div>
  );
}
