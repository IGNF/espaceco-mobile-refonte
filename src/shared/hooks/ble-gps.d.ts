/**
 * Déclarations de types pour le module JS `ble-gps.js`.
 *
 * `ble-gps.js` remplace `navigator.geolocation` par une source NMEA issue d'un
 * récepteur GPS Bluetooth externe (mode client SPP ou mode serveur SPP), et
 * expose des points d'injection pour l'UI (dialog de sélection, indicateur de
 * chargement) ainsi que le niveau de batterie et les dernières trames NMEA.
 */

/** État GPS accumulé à partir des trames NMEA (GGA/RMC/GSA/GSV). */
export interface BleGpsNmeaState {
  lat?: number;
  lon?: number;
  alt?: number | null;
  hdop?: number;
  vdop?: number;
  pdop?: number;
  geoidal?: number | null;
  /** Qualité du fix : 'fix' | 'dgps-fix' | 'rtk' | 'rtk-float'… */
  fixType?: string | null;
  satellites?: number;
  time?: Date;
  /** Vitesse en nœuds (convertie en m/s dans la position). */
  speed?: number;
  heading?: number;
  variation?: number;
  variationPole?: string;
  selectionMode?: string;
  fixMode?: string;
  satsActive?: unknown[];
  satsVisible?: unknown[];
  lastSentence?: ({ sentenceId?: string } & Record<string, unknown>) | null;
  lastFix?: number;
  [key: string]: unknown;
}

/** Signature de la fonction d'affichage du dialog de sélection d'appareil. */
export type BleGpsSelectDialog = (
  choices: Record<string, string>,
  title: string,
  onSelect: (selectedDeviceId: string) => void
) => void;

/** Injecte la fonction d'affichage du dialog de sélection d'appareil Bluetooth. */
export function setSelectDialog(fn: BleGpsSelectDialog): void;

/** Injecte la fonction affichant/masquant un indicateur de chargement (scan). */
export function setLoadingFn(fn: (show: boolean) => void): void;

/** Enregistre un callback appelé avec le niveau de batterie (0-100) du récepteur. */
export function setBatteryCallback(cb: (level: number) => void): void;

/** Renvoie le dernier état NMEA parsé (position, DOP, satellites, qualité…). */
export function getNmeaParsed(): BleGpsNmeaState;
