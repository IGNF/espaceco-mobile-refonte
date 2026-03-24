import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type DirectContributionConflict,
  getDirectContributionConflictFieldDiffs,
  type DirectContributionConflictResolutionChoice,
} from '@/domain/community/directContributionConflicts';
import { Alert } from '@/shared/ui/Alert';
import { Button } from '@/shared/ui/Button';
import { joinCSSClassNames } from '@/shared/utils/join';
import typography from '@/shared/styles/typography.module.css';
import styles from './DirectContributionConflictAlert.module.css';

interface DirectContributionConflictAlertProps {
  isOpen: boolean;
  conflict: DirectContributionConflict | null;
  onClose: () => void;
  onConfirmResolutions?: (
    resolutionsByConflictKey: Record<string, DirectContributionConflictResolutionChoice>
  ) => void;
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

/**
 * First conflict-management UI for direct contribution.
 * It mirrors the legacy object-level choices and keeps the selected decisions local until the real resolution actions are wired.
 */
export function DirectContributionConflictAlert({
  isOpen,
  conflict,
  onClose,
  onConfirmResolutions,
}: DirectContributionConflictAlertProps) {
  const { t } = useTranslation();
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

  const canConfirm =
    conflict != null &&
    conflict.conflicts.length > 0 &&
    conflict.conflicts.every((conflictObject) => {
      return Boolean(resolutionsByConflictKey[conflictObject.key]);
    });

  const handleResolutionChoice = (
    conflictKey: string,
    choice: DirectContributionConflictResolutionChoice
  ) => {
    setResolutionsByConflictKey((current) => ({
      ...current,
      [conflictKey]: choice,
    }));
  };

  const handleConfirm = () => {
    if (!canConfirm || !onConfirmResolutions) {
      return;
    }

    onConfirmResolutions(resolutionsByConflictKey);
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
      buttons={[
        {
          label: t('layers.directContribution.conflicts.actions.close'),
          onClick: onClose,
          variant: 'outline',
        },
        ...(onConfirmResolutions
          ? [
              {
                label: t('layers.directContribution.conflicts.actions.validate'),
                onClick: handleConfirm,
              },
            ]
          : []),
      ]}
    >
      {!conflict ? null : (
        <div className={styles.content}>
          <div className={styles.column}>
            <h3 className={joinCSSClassNames(typography.heading2, styles.sectionTitle)}>
              {t('layers.directContribution.conflicts.objectsTitle')}
            </h3>

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
                    <span className={styles.objectButtonLabel}>
                      {conflictObject.objectLabel}
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

          <div className={styles.column}>
            {!selectedConflict ? null : (
              <>
                <h3 className={joinCSSClassNames(typography.heading2, styles.sectionTitle)}>
                  {selectedConflict.objectLabel}
                </h3>

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

                <div className={styles.detailCard}>
                  <h4 className={joinCSSClassNames(typography.textLarge, styles.detailTitle)}>
                    {t('layers.directContribution.conflicts.comparisonTitle')}
                  </h4>

                  <div className={styles.fieldList}>
                    {selectedConflictFieldDiffs.map((fieldDiff) => (
                      <div
                        key={fieldDiff.name}
                        className={joinCSSClassNames(
                          styles.fieldRow,
                          fieldDiff.state === 'different' && styles.fieldRowDifferent
                        )}
                      >
                        <span className={styles.fieldName}>{fieldDiff.name}</span>
                        <div className={styles.fieldValueGroup}>
                          <span className={styles.fieldValueLabel}>
                            {t('layers.directContribution.conflicts.localValue')}
                          </span>
                          <span className={styles.fieldValue}>
                            {fieldDiff.localValue === null
                              ? '-'
                              : fieldDiff.localValue === undefined
                                ? 'undefined'
                                : String(fieldDiff.localValue)}
                          </span>
                        </div>
                        <div className={styles.fieldValueGroup}>
                          <span className={styles.fieldValueLabel}>
                            {t('layers.directContribution.conflicts.serverValue')}
                          </span>
                          <span className={styles.fieldValue}>
                            {fieldDiff.serverValue === null
                              ? '-'
                              : fieldDiff.serverValue === undefined
                                ? 'undefined'
                                : String(fieldDiff.serverValue)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </Alert>
  );
}
