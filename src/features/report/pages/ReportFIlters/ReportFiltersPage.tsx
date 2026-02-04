import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { ReportStatus } from '@ign/mobile-core';
import { SlideUpPage } from '@/shared/ui/SlideUpPage';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Button } from '@/shared/ui/Button';
import { Checkbox } from '@/shared/ui/Checkbox';
import { Toggle } from '@/shared/ui/Toggle';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useCommunity } from '@/features/community/hooks/useCommunity';
import type { ReportFilters, ThemeFilter } from '@/domain/report/models';
import { getStatusColor } from '@/shared/utils/reportStatus';

import styles from './ReportFiltersPage.module.css';
import screen from '@/shared/styles/screen.module.css';
import typography from '@/shared/styles/typography.module.css';
import inputs from '@/shared/styles/inputs.module.css';

const FILTER_STATUSES = [
  ReportStatus.Valid,
  ReportStatus.Submit,
  ReportStatus.Pending,
  ReportStatus.Reject,
] as const;

/**
 * Extract available themes from user's community memberships.
 */
function extractAvailableThemes(
  communitiesMembers: { community_id: number; profile?: any }[] | undefined,
  activeCommunityId: number | undefined
): ThemeFilter[] {
  if (!communitiesMembers || communitiesMembers.length === 0) return [];

  // Filter communities members by active community id
  const relevantMembers = activeCommunityId
    ? communitiesMembers.filter(cm => cm.community_id === activeCommunityId)
    : communitiesMembers;

  const themes = relevantMembers
    .flatMap(cm => {
      const profile = cm.profile;
      if (!profile) return [];
      const profiles = Array.isArray(profile) ? profile : [profile];
      return profiles.flatMap((p: any) => {
        if (!p.themes) return [];
        return (p.themes as any[])
          .filter((t: any) => t.theme)
          .map((t: any) => ({ community: cm.community_id, theme: t.theme as string }));
      });
    });

  // Deduplicate themes
  const seen = new Set<string>();
  return themes.filter(t => {
    const key = `${t.community}:${t.theme}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export interface ReportFiltersPageProps {
  isOpen: boolean;
  filters: ReportFilters;
  onApply: (filters: ReportFilters) => void;
  onClose: () => void;
}

export function ReportFiltersPage({ isOpen, filters, onApply, onClose }: ReportFiltersPageProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { activeCommunity } = useCommunity();

  const [selectedStatuses, setSelectedStatuses] = useState<ReportStatus[]>(
    filters.status ?? []
  );
  const [updatingDate, setUpdatingDate] = useState<string>(
    filters.updating_date ?? ''
  );
  const [myReportsOnly, setMyReportsOnly] = useState<boolean>(
    filters.myReportsOnly ?? false
  );
  const [selectedThemes, setSelectedThemes] = useState<ThemeFilter[]>(
    filters.themes ?? []
  );
  const [prevFilters, setPrevFilters] = useState(filters);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  // Sync local state when the modal opens or filters change (React 19 pattern)
  if (isOpen && (!prevIsOpen || filters !== prevFilters)) {
    setPrevFilters(filters);
    setPrevIsOpen(isOpen);
    setSelectedStatuses(filters.status ?? []);
    setUpdatingDate(filters.updating_date ?? '');
    setMyReportsOnly(filters.myReportsOnly ?? false);
    setSelectedThemes(filters.themes ?? []);
  }

  if (!isOpen && prevIsOpen) {
    setPrevIsOpen(isOpen);
  }

  const availableThemes = useMemo(
    () => extractAvailableThemes(user?.communities_member, activeCommunity?.id),
    [user?.communities_member, activeCommunity?.id]
  );

  const toggleStatus = (status: ReportStatus) => {
    setSelectedStatuses(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const isThemeSelected = (tf: ThemeFilter) =>
    selectedThemes.some(t => t.community === tf.community && t.theme === tf.theme);

  const toggleTheme = (tf: ThemeFilter) => {
    setSelectedThemes(prev =>
      isThemeSelected(tf)
        ? prev.filter(t => !(t.community === tf.community && t.theme === tf.theme))
        : [...prev, tf]
    );
  };

  const handleEraseFilters = () => {
    setSelectedStatuses([]);
    setUpdatingDate('');
    setMyReportsOnly(false);
    setSelectedThemes([]);
    onApply({});
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleApply = () => {
    const newFilters: ReportFilters = {};
    if (selectedStatuses.length > 0) {
      newFilters.status = selectedStatuses;
    }
    if (updatingDate) {
      newFilters.updating_date = updatingDate;
    }
    if (myReportsOnly) {
      newFilters.myReportsOnly = true;
    }
    if (selectedThemes.length > 0) {
      newFilters.themes = selectedThemes;
    }
    onApply(newFilters);
    onClose();
  };

  const overlay = isOpen ? createPortal(
    <div
      className={`${screen.overlay} ${styles.overlay}`}
      onClick={onClose}
      aria-hidden="true"
    />,
    document.body
  ) : null;

  return (
    <>
      {overlay}
      <SlideUpPage
        isOpen={isOpen}
        onClose={onClose}
        level={2}
        className={styles.filtersPage}
        fullPage={false}
      >
        <div className={styles.filtersContainer}>
          <PageHeader
            title={t('reports.filters.headerTitle')}
            subtitle={t('reports.filters.headerSubtitle')}
            onClose={onClose}
          />

          <main className={screen.screenContainer + " " + styles.content}>
            <div className={styles.titleSection}>
              <h1 className={typography.title}>{t('reports.filters.title')}</h1>
              <p className={typography.subtitle}>
                {t('reports.filters.description')}
              </p>
            </div>

            <div className={styles.filterOptions}>
              {/* Report type filter */}
              <div className={styles.filterGroup}>
                <h2 className={styles.filterLabel}>{t('reports.filters.reportType')}</h2>
                <Toggle
                  label={t('reports.filters.myReportsOnly')}
                  checked={myReportsOnly}
                  onChange={setMyReportsOnly}
                  color="primary"
                />
              </div>

              {/* Theme filter */}
              {availableThemes.length > 0 && (
                <div className={styles.filterGroup}>
                  <h2 className={styles.filterLabel}>{t('reports.filters.theme')}</h2>
                  <div className={styles.checkboxList}>
                    {availableThemes.map(tf => (
                      <Checkbox
                        key={`${tf.community}:${tf.theme}`}
                        label={tf.theme}
                        checked={isThemeSelected(tf)}
                        onChange={() => toggleTheme(tf)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Status filter */}
              <div className={styles.filterGroup}>
                <h2 className={styles.filterLabel}>{t('reports.filters.status')}</h2>
                <div className={styles.statusList}>
                  {FILTER_STATUSES.map(status => {
                    const isSelected = selectedStatuses.includes(status);
                    return (
                      <button
                        key={status}
                        type="button"
                        className={`${styles.statusPill} ${isSelected ? styles.statusPillActive : ''}`}
                        onClick={() => toggleStatus(status)}
                      >
                        <span
                          className={styles.statusDot + " " + (isSelected ? styles.statusDotActive : '')}
                          style={{ backgroundColor: getStatusColor(status) }}
                        />
                        {t(`reports.filters.statusOptions.${status}`)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Update date filter */}
              <div className={styles.filterGroup}>
                <h2 className={styles.filterLabel}>{t('reports.filters.updatedAt')}</h2>
                <input
                  type="date"
                  className={inputs.input}
                  value={updatingDate}
                  onChange={e => setUpdatingDate(e.target.value)}
                  placeholder={t('reports.filters.datePlaceholder')}
                />
              </div>
            </div>

          </main>
          {/* Actions buttons */}
          <div className={styles.actions}>
            <Button color="primary" onClick={handleApply}>
              {t('reports.filters.applyFilters')}
            </Button>

            <Button
              color="danger"
              variant="outline"
              onClick={handleEraseFilters}
            >
              {t('reports.filters.eraseFilters')}
            </Button>
          </div>
        </div>
      </SlideUpPage>
    </>
  );
}
