import { createPortal } from 'react-dom';
import { useBackHandler } from '@/shared/hooks/useBackHandler';
import type { MapToolbarItem } from '@/features/map/components/MapToolbar';
import { MapToolbar } from '@/features/map/components/MapToolbar';
import styles from './DirectContributionMapOverlay.module.css';

const DEFAULT_Z_INDEX = 130;
/* Toolbox must remain behind address/parcel search panel (50) and the layers pages (90+). */
const BEHIND_FOREGROUND_Z_INDEX = 40;

export interface DirectContributionMapOverlayProps {
  isOpen: boolean;
  items: MapToolbarItem[];
  statusText?: string;
  onItemClick: (toolId: string) => void;
  onClose: () => void;
  /**
   * Keeps the toolbar mounted, but paints it under foreground pages
   * such as the layers panel and the address search.
   */
  isBehind?: boolean;
}

export function DirectContributionMapOverlay({
  isOpen,
  items,
  statusText,
  onItemClick,
  onClose,
  isBehind = false,
}: DirectContributionMapOverlayProps) {
  const zIndex = isBehind ? BEHIND_FOREGROUND_Z_INDEX : DEFAULT_Z_INDEX;

  useBackHandler(isOpen, onClose, zIndex);

  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div className={styles.overlay} style={{ zIndex }}>
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
