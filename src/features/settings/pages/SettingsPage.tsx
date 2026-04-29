import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SlideUpPage } from '@/shared/ui/SlideUpPage';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Button } from '@/shared/ui/Button';

import { showToastSafe } from '@/shared/utils/toast';

import { useSettings } from '@/features/settings/hooks/useSettings';

import IconAngleDown from '@/shared/assets/icons/icon-angle-down.svg?react';
import screen from '@/shared/styles/screen.module.css';
import inputs from '@/shared/styles/inputs.module.css';
import typography from '@/shared/styles/typography.module.css';

import { useCommunity } from '@/features/community/hooks/useCommunity';

import styles from './SettingsPage.module.css';
import type { DisplayMode } from '@/domain/user/models';
import { useAppSettings } from '@/features/settings/hooks/useAppSettings';
import { Toggle } from '@/shared/ui/Toggle';
import type { MapSettings } from '@/domain/map/models';

export interface SettingsPageProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsPage({ isOpen, onClose }: SettingsPageProps) {
  const { t } = useTranslation();
  const [isMapSectionExpanded, setIsMapSectionExpanded] = useState(false);
  const [isGpsSectionExpanded, setIsGpsSectionExpanded] = useState(false);
  const [isTraceSectionExpanded, setIsTraceSectionExpanded] = useState(false);
  const [isAdvancedSectionExpanded, setIsAdvancedSectionExpanded] = useState(false);

  const { activeCommunity } = useCommunity();
  const { mapSettings, setMapSettings, displayMode, setDisplayMode } = useAppSettings();

  const {
    pendingGpsSourceType,
    activeGpsSourceInfo,
    isGpsSourcePluginAvailable,
    canSetGpsSource,
    isLoading,
    isApplyingGpsSource,
    isApplyingTraceSettings,
    gpsSourceErrorCode,
    traceSettingsErrorCode,
    traceMinAccuracyInput,
    traceTolerancePedestrianInput,
    traceToleranceCarInput,
    setPendingGpsSourceType,
    setTraceMinAccuracyInput,
    setTraceTolerancePedestrianInput,
    setTraceToleranceCarInput,
    applyGpsSource,
    applyTraceSettings,
  } = useSettings();

  const currentSourceType = activeGpsSourceInfo.type === 'external' ? 'external' : 'internal';
  const currentSourceText = t(`settings.gps.source.${currentSourceType}`);
  const currentSourceLabel = activeGpsSourceInfo.type === 'external' && activeGpsSourceInfo.name
    ? `${currentSourceText} (${activeGpsSourceInfo.name})`
    : currentSourceText;

  const canChooseExternal = isGpsSourcePluginAvailable && canSetGpsSource;
  const isGpsSourceFormDisabled = isLoading || isApplyingGpsSource;
  const isTraceSettingsFormDisabled = isLoading || isApplyingTraceSettings;

  const handleApplyGpsSource = async () => {
    const success = await applyGpsSource();
    if (!success) return;

    await showToastSafe({
      text: t('settings.gps.applySuccess'),
      duration: 'short',
      position: 'bottom',
    });
  };

  const handleApplyTraceSettings = async () => {
    const success = await applyTraceSettings();
    if (!success) return;

    await showToastSafe({
      text: t('settings.trace.applySuccess'),
      duration: 'short',
      position: 'bottom',
    });
  };

  const handleSetDisplayMode = async (displayMode: DisplayMode) => {
    await setDisplayMode(displayMode);

    await showToastSafe({
      text: t('settings.advanced.displayMode.updated'),
      duration: 'short',
      position: 'bottom',
    });
  };

  const handleSetMapSettings = async (settings: MapSettings) => {
    await setMapSettings(settings);

    await showToastSafe({
      text: t('settings.updated'),
      duration: 'short',
      position: 'bottom',
    });
  };

  return (
    <SlideUpPage isOpen={isOpen} onClose={onClose}>
      <PageHeader
        title={t('settings.headerTitle')}
        subtitle={activeCommunity?.name ?? t('settings.headerSubtitle')}
        showBackButton
        onBack={onClose}
        onClose={onClose}
      />

      <main className={`${screen.screenContainer} ${styles.content}`}>

        {/* Maps settings */}

        {displayMode !== 'beginner' && (
          <>
            <section className={styles.section}>
              <button
                type='button'
                className={styles.sectionHeaderButton}
                onClick={() => setIsMapSectionExpanded((value) => !value)}
                aria-expanded={isMapSectionExpanded}
              >
                <h2 className={styles.sectionTitle}>{t('settings.map.title')}</h2>
                <IconAngleDown
                  className={`${styles.chevron} ${isMapSectionExpanded ? styles.chevronExpanded : ''}`}
                  aria-hidden='true'
                />
              </button>

              {isMapSectionExpanded && (
                <>
                  <p className={`${typography.caption} ${styles.sectionDescription}`}>
                    {t('settings.map.description')}
                  </p>

                  <div className={styles.toggleFieldsGrid}>
                    <div className={styles.toggleField}>
                      <label className={inputs.field}>
                        <span className={inputs.label}>{t('settings.map.rotation.title')}</span>
                      </label>
                      <Toggle
                        checked={mapSettings.isRotationEnabled}
                        onChange={() => handleSetMapSettings({
                          ...mapSettings,
                          isRotationEnabled: !mapSettings.isRotationEnabled,
                        })}
                      />
                    </div>
                    <span className={typography.caption}>{t('settings.map.rotation.description')}</span>
                  </div>

                  <div className={styles.toggleFieldsGrid}>
                    <div className={styles.toggleField}>
                      <label className={inputs.field}>
                        <span className={inputs.label}>{t('settings.map.zoom.title')}</span>
                      </label>
                      <Toggle
                        checked={mapSettings.isZoomEnabled}
                        onChange={() => handleSetMapSettings({
                          ...mapSettings,
                          isZoomEnabled: !mapSettings.isZoomEnabled,
                        })}
                      />
                    </div>
                    <span className={typography.caption}>{t('settings.map.zoom.description')}</span>
                  </div>

                  <div className={styles.toggleFieldsGrid}>
                    <div className={styles.toggleField}>
                      <label className={inputs.field}>
                        <span className={inputs.label}>{t('settings.map.search.title')}</span>
                      </label>
                      <Toggle
                        checked={mapSettings.isSearchEnabled}
                        onChange={() => handleSetMapSettings({
                          ...mapSettings,
                          isSearchEnabled: !mapSettings.isSearchEnabled,
                        })}
                      />
                    </div>
                    <span className={typography.caption}>{t('settings.map.search.description')}</span>
                  </div>
                </>
              )}
            </section>
          </>
        )}

        {/* Sources GPS */}

        <section className={styles.section}>
          <button
            type='button'
            className={styles.sectionHeaderButton}
            onClick={() => setIsGpsSectionExpanded((value) => !value)}
            aria-expanded={isGpsSectionExpanded}
          >
            <h2 className={styles.sectionTitle}>{t('settings.gps.title')}</h2>
            <IconAngleDown
              className={`${styles.chevron} ${isGpsSectionExpanded ? styles.chevronExpanded : ''}`}
              aria-hidden='true'
            />
          </button>

          {isGpsSectionExpanded && (
            <>
              <p className={`${typography.caption} ${styles.sectionDescription}`}>
                {t('settings.gps.description')}
              </p>

              <div className={styles.currentSource}>
                <span className={typography.caption}>{t('settings.gps.currentSource')}</span>
                <strong className={styles.currentSourceValue}>{currentSourceLabel}</strong>
              </div>

              {!isGpsSourcePluginAvailable && (
                <p className={`${typography.caption} ${styles.infoMessage}`}>
                  {t('settings.gps.pluginUnavailable')}
                </p>
              )}
              {isGpsSourcePluginAvailable && !canSetGpsSource && (
                <p className={`${typography.caption} ${styles.infoMessage}`}>
                  {t('settings.gps.changeUnsupported')}
                </p>
              )}

              <fieldset className={styles.fieldset} disabled={isGpsSourceFormDisabled}>
                <legend className={styles.legend}>{t('settings.gps.chooseSource')}</legend>

                <label className={styles.radioOption}>
                  <input
                    type='radio'
                    name='gps-source'
                    value='internal'
                    checked={pendingGpsSourceType === 'internal'}
                    onChange={() => setPendingGpsSourceType('internal')}
                  />
                  <span>{t('settings.gps.source.internal')}</span>
                </label>

                <label
                  className={`${styles.radioOption} ${!canChooseExternal ? styles.radioOptionDisabled : ''}`}
                >
                  <input
                    type='radio'
                    name='gps-source'
                    value='external'
                    checked={pendingGpsSourceType === 'external'}
                    onChange={() => setPendingGpsSourceType('external')}
                    disabled={!canChooseExternal}
                  />
                  <span>{t('settings.gps.source.external')}</span>
                </label>
              </fieldset>

              {gpsSourceErrorCode && (
                <p className={`${inputs.error} ${styles.errorMessage}`}>
                  {t(`settings.gps.errors.${gpsSourceErrorCode}`)}
                </p>
              )}

              <Button
                color='primary'
                fullWidth
                onClick={handleApplyGpsSource}
                disabled={isGpsSourceFormDisabled}
                loading={isApplyingGpsSource}
              >
                {t('settings.gps.apply')}
              </Button>
            </>
          )}
        </section>

        {/* Réglages traces GPS */}

        <section className={styles.section}>
          <button
            type='button'
            className={styles.sectionHeaderButton}
            onClick={() => setIsTraceSectionExpanded((value) => !value)}
            aria-expanded={isTraceSectionExpanded}
          >
            <h2 className={styles.sectionTitle}>{t('settings.trace.title')}</h2>
            <IconAngleDown
              className={`${styles.chevron} ${isTraceSectionExpanded ? styles.chevronExpanded : ''}`}
              aria-hidden='true'
            />
          </button>

          {isTraceSectionExpanded && (
            <>
              <p className={`${typography.caption} ${styles.sectionDescription}`}>
                {t('settings.trace.description')}
              </p>

              <div className={styles.fieldsGrid}>
                <label className={inputs.field}>
                  <span className={inputs.label}>{t('settings.trace.minAccuracy')}</span>
                  <input
                    type='number'
                    min='0'
                    step='0.1'
                    inputMode='decimal'
                    className={inputs.input}
                    value={traceMinAccuracyInput}
                    onChange={(event) => setTraceMinAccuracyInput(event.target.value)}
                  />
                </label>

                <label className={inputs.field}>
                  <span className={inputs.label}>{t('settings.trace.tolerancePedestrian')}</span>
                  <input
                    type='number'
                    min='0'
                    step='0.1'
                    inputMode='decimal'
                    className={inputs.input}
                    value={traceTolerancePedestrianInput}
                    onChange={(event) => setTraceTolerancePedestrianInput(event.target.value)}
                  />
                </label>

                <label className={inputs.field}>
                  <span className={inputs.label}>{t('settings.trace.toleranceCar')}</span>
                  <input
                    type='number'
                    min='0'
                    step='0.1'
                    inputMode='decimal'
                    className={inputs.input}
                    value={traceToleranceCarInput}
                    onChange={(event) => setTraceToleranceCarInput(event.target.value)}
                  />
                </label>
              </div>

              {traceSettingsErrorCode && (
                <p className={`${inputs.error} ${styles.errorMessage}`}>
                  {t(`settings.trace.errors.${traceSettingsErrorCode}`)}
                </p>
              )}

              <Button
                color='primary'
                fullWidth
                onClick={handleApplyTraceSettings}
                disabled={isTraceSettingsFormDisabled}
                loading={isApplyingTraceSettings}
              >
                {t('settings.trace.apply')}
              </Button>
            </>
          )}
        </section>

        {/* Paramètres avancés */}

        <section className={styles.section}>
          <button
            type='button'
            className={styles.sectionHeaderButton}
            onClick={() => setIsAdvancedSectionExpanded((value) => !value)}
            aria-expanded={isAdvancedSectionExpanded}
          >
            <h2 className={styles.sectionTitle}>{t('settings.advanced.title')}</h2>
            <IconAngleDown
              className={`${styles.chevron} ${isAdvancedSectionExpanded ? styles.chevronExpanded : ''}`}
              aria-hidden='true'
            />
          </button>

          {isAdvancedSectionExpanded && (
            <>
              <p className={`${typography.caption} ${styles.sectionDescription}`}>
                {t('settings.advanced.description')}
              </p>

              <div className={styles.fieldsGrid}>
                <label className={inputs.field}>
                  <span className={inputs.label}>{t('settings.advanced.displayMode.title')}</span>
                </label>
                <select
                  className={inputs.input}
                  value={displayMode ?? 'beginner'}
                  onChange={(event) => handleSetDisplayMode(event.target.value as DisplayMode)}
                >
                  <option value='beginner'>{t('settings.advanced.displayMode.beginner')}</option>
                  <option value='advanced'>{t('settings.advanced.displayMode.advanced')}</option>
                  <option value='expert'>{t('settings.advanced.displayMode.expert')}</option>
                </select>
              </div>
            </>
          )}

        </section>
      </main>
    </SlideUpPage>
  );
}
