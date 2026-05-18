import { useCallback, useState } from 'react';

import type { CommunityThemeConfig } from '@/domain/community/models';

export function useFastReportFlow() {
  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);
  const [isGpsOpen, setIsGpsOpen] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<CommunityThemeConfig | null>(null);

  const openGps = useCallback((theme: CommunityThemeConfig) => {
    setSelectedTheme(theme);
    setIsThemePickerOpen(false);
    setIsGpsOpen(true);
  }, []);

  const openFromTab = useCallback(() => {
    setIsThemePickerOpen(true);
  }, []);

  const closeThemePicker = useCallback(() => {
    setIsThemePickerOpen(false);
  }, []);

  const closeGps = useCallback(() => {
    setIsGpsOpen(false);
    setSelectedTheme(null);
  }, []);

  const chooseAnotherTheme = useCallback(() => {
    setIsThemePickerOpen(true);
  }, []);

  return {
    isActive: isThemePickerOpen || isGpsOpen,
    isThemePickerOpen,
    isGpsOpen,
    selectedTheme,
    openFromTab,
    openGps,
    closeThemePicker,
    closeGps,
    chooseAnotherTheme,
  };
}
