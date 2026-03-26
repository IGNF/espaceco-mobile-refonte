import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useCommunity } from '@/features/community/hooks/useCommunity';
import {
  type DirectContributionConflict,
  getDirectContributionConflictFieldDiffs,
  type DirectContributionConflictResolutionChoice,
  type DirectContributionConflictResolutionSelection,
} from '@/domain/community/directContributionConflicts';
import { extractThemeConfigs } from '@/features/report/utils/reportAttributes';
import { Alert } from '@/shared/ui/Alert';
import { Button } from '@/shared/ui/Button';
import { joinCSSClassNames } from '@/shared/utils/join';
import IconCheck from '@/shared/assets/icons/icon-check.svg?react';
import inputs from '@/shared/styles/inputs.module.css';
import typography from '@/shared/styles/typography.module.css';
import styles from './DirectContributionConflictAlert.module.css';

interface DirectContributionConflictAlertProps {
  isOpen: boolean;
  conflict: DirectContributionConflict | null;
  onClose: () => void;
  onConfirmResolutions?: (
    selection: DirectContributionConflictResolutionSelection
  ) => Promise<boolean>;
}

function getConflictResolutionColor(
  choice: DirectContributionConflictResolutionChoice
): 'primary' | 'danger' | 'secondary' {
  switch (choice) {
    case 'force':
      return 'primary';
    case 'delete':
      return 'danger';
    case 'report':
      return 'secondary';
  }
}

function getResolutionTranslationKey(
  choice: DirectContributionConflictResolutionChoice
): string {
  switch (choice) {
    case 'force':
      return 'layers.directContribution.conflicts.choices.force';
    case 'delete':
      return 'layers.directContribution.conflicts.choices.delete';
    case 'report':
      return 'layers.directContribution.conflicts.choices.report';
  }
}

function getRenderedFieldValue(value: unknown): string {
  if (value === null) {
    return '-';
  }
  if (value === undefined) {
    return 'undefined';
  }
  return String(value);
}

/**
 * Conflict-management UI for direct contribution.
 * It mirrors the legacy object-level choices and asks for one shared report theme when at least one conflict is marked "Signaler".
 */
export function DirectContributionConflictAlert({
  isOpen,
  conflict,
  onClose,
  onConfirmResolutions,
}: DirectContributionConflictAlertProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { activeCommunity } = useCommunity();
  const [selectedConflictKey, setSelectedConflictKey] = useState<string | null>(
    () => conflict?.conflicts[0]?.key ?? null
  );
  const [resolutionsByConflictKey, setResolutionsByConflictKey] = useState<
    Record<string, DirectContributionConflictResolutionChoice>
  >(() => {
    if (!conflict) {
      return {};
    }

    return conflict.conflicts.reduce<Record<string, DirectContributionConflictResolutionChoice>>(
      (current, conflictObject) => {
        if (conflictObject.resolutionChoice) {
          current[conflictObject.key] = conflictObject.resolutionChoice;
        }

        return current;
      },
      {}
    );
  });
  const [selectedReportTheme, setSelectedReportTheme] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const reportThemeOptions = useMemo(() => {
    const themeConfigs = extractThemeConfigs(
      user?.communities_member,
      activeCommunity?.id
    );

    return Array.from(
      new Set(
        themeConfigs.map((themeConfig) => themeConfig.theme)
      )
    );
  }, [activeCommunity?.id, user?.communities_member]);

  const selectedConflict = useMemo(() => {
    if (!conflict || !selectedConflictKey) {
      return null;
    }

    return (
      conflict.conflicts.find(
        (conflictObject) => conflictObject.key === selectedConflictKey
      ) ?? null
    );
  }, [conflict, selectedConflictKey]);

  const selectedConflictFieldDiffs = useMemo(() => {
    if (!selectedConflict) {
      return [];
    }

    return getDirectContributionConflictFieldDiffs(
      selectedConflict.localObject,
      selectedConflict,
      selectedConflict.locallyUpdatedFieldNames
    );
  }, [selectedConflict]);

  const requiresReportTheme = Object.values(resolutionsByConflictKey).some((choice) => {
    return choice === 'report';
  });
  const unresolvedConflictCount = conflict
    ? conflict.conflicts.filter((conflictObject) => {
        return !resolutionsByConflictKey[conflictObject.key];
      }).length
    : 0;

  const canConfirm =
    conflict != null &&
    conflict.conflicts.length > 0 &&
    unresolvedConflictCount === 0 &&
    (!requiresReportTheme || selectedReportTheme.length > 0);

  const handleResolutionChoice = (
    conflictKey: string,
    choice: DirectContributionConflictResolutionChoice
  ) => {
    setResolutionsByConflictKey((current) => ({
      ...current,
      [conflictKey]: choice,
    }));
    setValidationError(null);
  };

  const handleConfirm = async () => {
    if (!onConfirmResolutions || isConfirming) {
      return;
    }

    if (requiresReportTheme && reportThemeOptions.length === 0) {
      setValidationError(
        t('layers.directContribution.conflicts.noThemeAvailable')
      );
      return;
    }

    if (unresolvedConflictCount > 0) {
      setValidationError(
        t('layers.directContribution.conflicts.pendingActions', {
          count: unresolvedConflictCount,
        })
      );
      return;
    }

    if (!canConfirm) {
      setValidationError(
        requiresReportTheme
          ? t('layers.directContribution.conflicts.themeRequired')
          : t('layers.directContribution.conflicts.noChoice')
      );
      return;
    }

    setValidationError(null);
    setIsConfirming(true);

    try {
      await onConfirmResolutions({
        resolutionsByConflictKey,
        reportTheme: requiresReportTheme ? selectedReportTheme : undefined,
      });
    } finally {
      setIsConfirming(false);
    }
  };

  const subtitle = conflict
    ? t('layers.directContribution.conflicts.subtitle', {
        count: conflict.conflicts.length,
        layerTitle:
          conflict.layerTitle ||
          t('layers.info.untitled'),
      })
    : undefined;

  return (
    <Alert
      isOpen={isOpen}
      onClose={onClose}
      title={t('layers.directContribution.conflicts.title')}
      subtitle={subtitle}
      size='wide'
      buttons={[
        {
          label: t('layers.directContribution.conflicts.actions.close'),
          onClick: onClose,
          variant: 'outline',
        },
      ]}
    >
      {!conflict ? null : (
        <div className={styles.content}>
          <div className={joinCSSClassNames(styles.column, styles.objectsColumn)}>
            <div className={styles.sectionCard}>
              <h3 className={joinCSSClassNames(typography.heading2, styles.sectionTitle)}>
                {t('layers.directContribution.conflicts.objectsTitle')}
              </h3>
              <p className={styles.sectionDescription}>
                {t('layers.directContribution.conflicts.objectsHelp', {
                  count: conflict.conflicts.length,
                })}
              </p>

              <div className={styles.objectList}>
                {conflict.conflicts.map((conflictObject) => {
                  const selectedChoice = resolutionsByConflictKey[conflictObject.key];

                  return (
                    <button
                      key={conflictObject.key}
                      type='button'
                      className={joinCSSClassNames(
                        styles.objectButton,
                        selectedConflictKey === conflictObject.key && styles.objectButtonSelected
                      )}
                      onClick={() => setSelectedConflictKey(conflictObject.key)}
                  >
                      <span className={styles.objectButtonHeader}>
                        {selectedChoice ? (
                          <span className={styles.objectResolvedIconWrapper}>
                            <IconCheck className={styles.objectResolvedIcon} />
                          </span>
                        ) : null}
                        <span className={styles.objectButtonLabel}>
                          {conflictObject.objectLabel}
                        </span>
                      </span>
                      <span className={styles.objectButtonMeta}>
                        {selectedChoice
                          ? t(
                              'layers.directContribution.conflicts.currentChoice',
                              {
                                choice: t(getResolutionTranslationKey(selectedChoice)),
                              }
                            )
                          : t('layers.directContribution.conflicts.noChoice')}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className={joinCSSClassNames(styles.column, styles.detailsColumn)}>
            {!selectedConflict ? null : (
              <>
                <div className={styles.sectionCard}>
                  <div className={styles.detailHeader}>
                    <div>
                      <h3 className={joinCSSClassNames(typography.heading2, styles.sectionTitle)}>
                        {selectedConflict.objectLabel}
                      </h3>
                      <p className={styles.sectionDescription}>
                        {t('layers.directContribution.conflicts.comparisonHelp')}
                      </p>
                    </div>
                  </div>

                  <div className={styles.actionRow}>
                    {(
                      [
                        'force',
                        'delete',
                        'report',
                      ] as DirectContributionConflictResolutionChoice[]
                    ).map((choice) => {
                      const isActive =
                        resolutionsByConflictKey[selectedConflict.key] === choice;

                      return (
                        <Button
                          key={choice}
                          type='button'
                          color={getConflictResolutionColor(choice)}
                          variant={isActive ? 'solid' : 'outline'}
                          onClick={() =>
                            handleResolutionChoice(selectedConflict.key, choice)
                          }
                        >
                          {t(getResolutionTranslationKey(choice))}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div className={joinCSSClassNames(styles.sectionCard, styles.detailCard)}>
                  <h4 className={joinCSSClassNames(typography.textLarge, styles.detailTitle)}>
                    {t('layers.directContribution.conflicts.comparisonTitle')}
                  </h4>

                  <div className={styles.fieldList}>
                    {selectedConflictFieldDiffs.length === 0 ? (
                      <p className={styles.emptyState}>
                        {t('layers.directContribution.conflicts.emptyComparison')}
                      </p>
                    ) : (
                      selectedConflictFieldDiffs.map((fieldDiff) => (
                        <div
                          key={fieldDiff.name}
                          className={joinCSSClassNames(
                            styles.fieldRow,
                            fieldDiff.state === 'different' && styles.fieldRowDifferent
                          )}
                        >
                          <div className={styles.fieldHeader}>
                            <span className={styles.fieldName}>{fieldDiff.name}</span>
                            {fieldDiff.isLocallyUpdated ? (
                              <span className={styles.fieldBadge}>
                                {t('layers.directContribution.conflicts.updatedField')}
                              </span>
                            ) : null}
                          </div>

                          <div className={styles.fieldValuesGrid}>
                            <div className={styles.fieldValueCard}>
                              <span className={styles.fieldValueLabel}>
                                {t('layers.directContribution.conflicts.localValue')}
                              </span>
                              <span
                                className={joinCSSClassNames(
                                  styles.fieldValue,
                                  fieldDiff.localValue === undefined && styles.fieldValueMissing
                                )}
                              >
                                {getRenderedFieldValue(fieldDiff.localValue)}
                              </span>
                            </div>
                            <div className={styles.fieldValueCard}>
                              <span className={styles.fieldValueLabel}>
                                {t('layers.directContribution.conflicts.serverValue')}
                              </span>
                              <span
                                className={joinCSSClassNames(
                                  styles.fieldValue,
                                  fieldDiff.serverValue === undefined && styles.fieldValueMissing
                                )}
                              >
                                {getRenderedFieldValue(fieldDiff.serverValue)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {!onConfirmResolutions ? null : (
                  <div className={joinCSSClassNames(styles.sectionCard, styles.validationSection)}>
                    {!requiresReportTheme ? null : (
                      <>
                        <div className={inputs.field}>
                          <label
                            htmlFor='direct-contribution-conflict-theme'
                            className={inputs.label}
                          >
                            {t('layers.directContribution.conflicts.themeLabel')}
                          </label>
                          <select
                            id='direct-contribution-conflict-theme'
                            className={inputs.select}
                            value={selectedReportTheme}
                            onChange={(event) => {
                              setSelectedReportTheme(event.target.value);
                              setValidationError(null);
                            }}
                          >
                            <option value=''>
                              {t('layers.directContribution.conflicts.themePlaceholder')}
                            </option>
                            {reportThemeOptions.map((themeName) => (
                              <option key={themeName} value={themeName}>
                                {themeName}
                              </option>
                            ))}
                          </select>
                        </div>

                        {reportThemeOptions.length === 0 ? (
                          <p className={styles.validationText}>
                            {t('layers.directContribution.conflicts.noThemeAvailable')}
                          </p>
                        ) : null}
                      </>
                    )}

                    {validationError ? (
                      <p className={styles.validationError}>{validationError}</p>
                    ) : null}

                    <Button
                      type='button'
                      fullWidth
                      loading={isConfirming}
                      disabled={!conflict}
                      onClick={() => {
                        void handleConfirm();
                      }}
                    >
                      {t('layers.directContribution.conflicts.actions.validate')}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </Alert>
  );
}
