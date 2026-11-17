import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { CommunityThemeConfig } from '@/domain/community/models';
import { Alert } from '@/shared/ui/Alert';
import { Button } from '@/shared/ui/Button';

import styles from './FastReportThemePicker.module.css';

const NO_THEMES: CommunityThemeConfig[] = [];

interface FastReportThemePickerProps {
  isOpen: boolean;
  title?: string;
  subtitle?: string;
  themes: CommunityThemeConfig[];
  /** Themes revealed in place of the « Autres » button. Without any, no « Autres » button is shown. */
  otherThemes?: CommunityThemeConfig[];
  onSelectTheme: (theme: CommunityThemeConfig) => void;
  onClose: () => void;
}

export function FastReportThemePicker({
  isOpen,
  title,
  subtitle,
  themes,
  otherThemes = NO_THEMES,
  onSelectTheme,
  onClose,
}: FastReportThemePickerProps) {
  const { t } = useTranslation();
  const [isOtherThemesRevealed, setIsOtherThemesRevealed] = useState(false);
  const [wasOpen, setWasOpen] = useState(isOpen);

  // Collapse « Autres » again each time the picker reopens.
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setIsOtherThemesRevealed(false);
    }
  }

  // Without any fast theme, a lone « Autres » button would be a useless extra tap.
  const showsOtherThemes = isOtherThemesRevealed || themes.length === 0;
  const visibleThemes = showsOtherThemes ? [...themes, ...otherThemes] : themes;
  const showsOtherButton = !showsOtherThemes && otherThemes.length > 0;

  return (
    <Alert
      isOpen={isOpen}
      onClose={onClose}
      title={title ?? t('reports.fastReport.themePicker.title')}
      subtitle={subtitle ?? t('reports.fastReport.themePicker.subtitle')}
      buttons={showsOtherButton ? [
        {
          label: t('reports.fastReport.themePicker.other'),
          onClick: () => setIsOtherThemesRevealed(true),
          variant: 'outline',
        },
      ] : []}
    >
      <div className={styles.themeList}>
        {visibleThemes.map((theme) => (
          <Button
            key={`${theme.communityId ?? 0}:${theme.theme}`}
            type="button"
            color="primary"
            variant="outline"
            fullWidth
            className={styles.themeButton}
            onClick={() => onSelectTheme(theme)}
          >
            {theme.theme}
          </Button>
        ))}
      </div>
    </Alert>
  );
}
