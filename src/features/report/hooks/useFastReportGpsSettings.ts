import { useCallback, useEffect, useState } from 'react';

import {
  DEFAULT_FAST_REPORT_GPS_SETTINGS,
} from '@/features/report/constants/fastReportGps.constants';
import type { FastReportGpsSettings } from '@/features/report/types/fastReportGps';
import { EspaceCo_SettingsStore } from '@/infra/persistence/settingsStore';

export function useFastReportGpsSettings() {
  const [settings, setSettings] = useState<FastReportGpsSettings>(DEFAULT_FAST_REPORT_GPS_SETTINGS);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      const storedSettings = await EspaceCo_SettingsStore.getFastReportGpsSettings();
      if (isMounted) {
        setSettings(storedSettings);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const saveSettings = useCallback(async (nextSettings: FastReportGpsSettings) => {
    const savedSettings = await EspaceCo_SettingsStore.saveFastReportGpsSettings(nextSettings);
    setSettings(savedSettings);
  }, []);

  return {
    settings,
    saveSettings,
  };
}
