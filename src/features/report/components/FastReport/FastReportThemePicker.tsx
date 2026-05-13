import { useTranslation } from 'react-i18next';

import type { CommunityThemeConfig } from '@/domain/community/models';
import { Alert } from '@/shared/ui/Alert';
import { Button } from '@/shared/ui/Button';

import styles from './FastReportThemePicker.module.css';

interface FastReportThemePickerProps {
  isOpen: boolean;
  themes: CommunityThemeConfig[];
  onSelectTheme: (theme: CommunityThemeConfig) => void;
  onSelectOther: () => void;
  onClose: () => void;
}

export function FastReportThemePicker({
  isOpen,
  themes,
  onSelectTheme,
  onSelectOther,
  onClose,
}: FastReportThemePickerProps) {
  const { t } = useTranslation();

  return (
    <Alert
      isOpen={isOpen}
      onClose={onClose}
      title={t('reports.fastReport.themePicker.title')}
      subtitle={t('reports.fastReport.themePicker.subtitle')}
      buttons={[
        {
          label: t('reports.fastReport.themePicker.other'),
          onClick: onSelectOther,
          variant: 'outline',
        },
      ]}
    >
      <div className={styles.themeList}>
        {themes.map((theme) => (
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
