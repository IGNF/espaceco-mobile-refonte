import { useContext } from 'react';

import { AppSettingsContext, type AppSettingsContextType } from '@/app/providers/AppSettingsContext';

export function useAppSettings(): AppSettingsContextType {
  const context = useContext(AppSettingsContext);

  if (!context) {
    throw new Error('useAppSettings must be used within an AppSettingsProvider');
  }

  return context;
}
