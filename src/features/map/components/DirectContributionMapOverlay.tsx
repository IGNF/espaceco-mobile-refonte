import { createPortal } from 'react-dom';
import type { MapToolbarItem } from '@/features/map/components/MapToolbar';
import { MapToolbar } from '@/features/map/components/MapToolbar';
import styles from './DirectContributionMapOverlay.module.css';

export interface DirectContributionMapOverlayProps {
  isOpen: boolean;
  items: MapToolbarItem[];
  statusText?: string;
  onItemClick: (toolId: string) => void;
}

export function DirectContributionMapOverlay({
  isOpen,
  items,
  statusText,
  onItemClick,
}: DirectContributionMapOverlayProps) {
  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div className={styles.overlay}>
      <div className={styles.toolbarWrapper}>
        <MapToolbar
          items={items}
          onItemClick={onItemClick}
          statusText={statusText}
        />
      </div>
    </div>,
    document.body
  );
}
