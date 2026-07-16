import { useContext } from 'react';

import {
  ExternalGpsContext,
  type ExternalGpsContextType,
} from '@/app/providers/ExternalGpsContext';

/**
 * Accès au contexte GPS externe (niveau de batterie du récepteur, état de
 * connexion et trames NMEA). Doit être utilisé sous un `ExternalGpsProvider`.
 */
export function useExternalGps(): ExternalGpsContextType {
  const context = useContext(ExternalGpsContext);
  if (!context) {
    throw new Error('useExternalGps must be used within an ExternalGpsProvider');
  }
  return context;
}
