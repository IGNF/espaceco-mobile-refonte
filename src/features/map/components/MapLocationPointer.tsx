import styles from './MapLocationPointer.module.css';
import IconAdd from '@/shared/assets/icons/icon-add.svg?react';

export function MapLocationPointer() {
  return (
    <div className={styles.locationTarget} aria-hidden="true">
      <IconAdd className={styles.locationTargetIcon} />
    </div>
  );
}
