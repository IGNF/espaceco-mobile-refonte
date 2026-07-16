import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

import { ActionSheet, type ActionSheetButton } from '@/shared/ui/ActionSheet';
import { Loading } from '@/shared/ui/Loading';
import {
  getNmeaParsed,
  setBatteryCallback,
  setLoadingFn,
  setSelectDialog,
} from '@/shared/hooks/ble-gps';

import { ExternalGpsContext, type ExternalGpsContextType } from './ExternalGpsContext';

interface SelectDialogState {
  title: string;
  buttons: ActionSheetButton[];
}

interface ExternalGpsProviderProps {
  children: ReactNode;
}

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(0, 0, 0, 0.4)',
  zIndex: 2000,
};

/**
 * Câble le hook `ble-gps` (GPS externe Bluetooth) à l'application React :
 *  - importe `ble-gps` (effet de bord : installe `navigator.geolocation.setSource`),
 *  - fournit le dialog de sélection d'appareil (ActionSheet),
 *  - fournit l'indicateur de chargement pendant le scan Bluetooth,
 *  - expose le niveau de batterie et les trames NMEA via le contexte.
 */
export function ExternalGpsProvider({ children }: ExternalGpsProviderProps) {
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [dialog, setDialog] = useState<SelectDialogState | null>(null);
  const pendingSelectRef = useRef<((selectedDeviceId: string) => void) | null>(null);

  useEffect(() => {
    setBatteryCallback((level) => setBatteryLevel(level));
    setLoadingFn((show) => setIsConnecting(show));

    setSelectDialog((choices, title, onSelect) => {
      pendingSelectRef.current = onSelect;
      const buttons: ActionSheetButton[] = Object.entries(choices).map(
        ([deviceId, label]) => ({
          label,
          variant: 'outline',
          onClick: () => {
            const handler = pendingSelectRef.current;
            pendingSelectRef.current = null;
            setDialog(null);
            handler?.(deviceId);
          },
        })
      );
      setDialog({ title, buttons });
    });
  }, []);

  const handleClose = useCallback(() => {
    pendingSelectRef.current = null;
    setDialog(null);
  }, []);

  const contextValue = useMemo<ExternalGpsContextType>(
    () => ({
      batteryLevel,
      isConnecting,
      getNmeaParsed: () => getNmeaParsed(),
    }),
    [batteryLevel, isConnecting]
  );

  return (
    <ExternalGpsContext.Provider value={contextValue}>
      {children}
      <ActionSheet
        isOpen={dialog !== null}
        onClose={handleClose}
        title={dialog?.title ?? ''}
        buttons={dialog?.buttons ?? []}
      />
      {isConnecting &&
        createPortal(
          <div style={overlayStyle} role='status' aria-live='polite'>
            <Loading size='large' label='Recherche des appareils Bluetooth…' />
          </div>,
          document.body
        )}
    </ExternalGpsContext.Provider>
  );
}
