import { createContext } from 'react';
import type { BleGpsNmeaState } from '@/shared/hooks/ble-gps';

export interface ExternalGpsContextType {
  /** Dernier niveau de batterie (0-100) reçu du récepteur externe, ou null. */
  batteryLevel: number | null;
  /** true pendant le scan/connexion Bluetooth (indicateur de chargement affiché). */
  isConnecting: boolean;
  /** Renvoie le dernier état NMEA parsé (position, DOP, satellites, qualité…). */
  getNmeaParsed: () => BleGpsNmeaState;
}

export const ExternalGpsContext = createContext<ExternalGpsContextType | null>(null);
