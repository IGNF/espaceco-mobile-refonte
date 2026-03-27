import type { Table, TableColumn } from '@ign/mobile-core';
import { useTranslation } from 'react-i18next';
import { useCommunity } from '@/features/community/hooks/useCommunity';
import type { DirectContributionFeatureCandidate } from '@/features/map/types/directContribution';
import {
  toDirectContributionDocumentValue,
  toDirectContributionLikeValue,
} from '@/domain/community/directContributionForm';
import { SlideUpPage } from '@/shared/ui/SlideUpPage';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Button } from '@/shared/ui/Button';
import { joinCSSClassNames } from '@/shared/utils/join';
import screen from '@/shared/styles/screen.module.css';
import stickyActions from '@/shared/styles/stickyActions.module.css';
import typography from '@/shared/styles/typography.module.css';
import styles from './DirectContributionFeatureDetailsPage.module.css';

type DetailSelectValues = string[] | Record<string, string | number | boolean | null>;

interface DirectContributionFeatureDetailsField {
  name: string;
  label: string;
  value: string;
}

export interface DirectContributionFeatureDetailsPageProps {
  isOpen: boolean;
  candidate: DirectContributionFeatureCandidate | null;
  canEdit: boolean;
  onEdit: () => void;
  onClose: () => void;
  onBack?: () => void;
}

function getSelectOptionLabel(
  column: TableColumn,
  rawValue: string
): string {
  const selectValues = (column as TableColumn & { selectValues?: DetailSelectValues }).selectValues;
  if (!selectValues || Array.isArray(selectValues)) {
    return rawValue;
  }
  
  for (const [label, value] of Object.entries(selectValues)) {
    if (String(value ?? '') === rawValue) {
      return label;
    }
  }

  return rawValue;
}

function formatDetailValue(
  column: TableColumn,
  rawValue: unknown,
  t: (key: string) => string
): string {
  if (rawValue === null || rawValue === undefined || rawValue === '') {
    return t('layers.directContribution.details.emptyValue');
  }

  const columnType = column.type.toLowerCase();

  if (columnType === 'like') {
    return String(toDirectContributionLikeValue(rawValue).cnt);
  }

  if (columnType === 'document') {
    const documentValue = toDirectContributionDocumentValue(rawValue);
    if (documentValue.file && 'name' in documentValue.file) {
      return documentValue.file.name;
    }

    return documentValue.documentId ?? t('layers.directContribution.details.emptyValue');
  }

  if (Array.isArray(rawValue)) {
    if (rawValue.length === 0) {
      return t('layers.directContribution.details.emptyValue');
    }

    return rawValue
      .map((value) => getSelectOptionLabel(column, String(value)))
      .join(', ');
  }

  if (typeof rawValue === 'boolean') {
    return rawValue
      ? t('layers.directContribution.details.yes')
      : t('layers.directContribution.details.no');
  }

  if (typeof rawValue === 'number') {
    return String(rawValue);
  }

  if (typeof rawValue === 'string') {
    return getSelectOptionLabel(column, rawValue);
  }

  return JSON.stringify(rawValue);
}

function getDetailFields(
  table: Table,
  candidate: DirectContributionFeatureCandidate,
  t: (key: string) => string
): DirectContributionFeatureDetailsField[] {
  return Object.entries(table.columns)
    .filter(([columnName]) => columnName !== table.geometryName)
    .map(([columnName, rawColumn]) => {
      return {
        columnName,
        column: rawColumn as TableColumn & { position?: number },
      };
    })
    .sort((left, right) => {
      const leftPosition = Number(left.column.position ?? 0);
      const rightPosition = Number(right.column.position ?? 0);
      return leftPosition - rightPosition;
    })
    .map(({ columnName, column }) => {

      return {
        name: columnName,
        label: (typeof column.title === 'string' && column.title.length > 0) ? column.title : columnName,
        value: formatDetailValue(
          column,
          candidate.feature.get(columnName),
          t
        ),
      };
    });
}

export function DirectContributionFeatureDetailsPage({
  isOpen,
  candidate,
  canEdit,
  onEdit,
  onClose,
  onBack,
}: DirectContributionFeatureDetailsPageProps) {
  const { t } = useTranslation();
  const { activeCommunity } = useCommunity();

  if (!candidate) {
    return null;
  }

  const detailFields = getDetailFields(candidate.table, candidate, t);

  return (
    <SlideUpPage isOpen={isOpen} onClose={onClose} level={2}>
      <PageHeader
        title={t('layers.directContribution.details.headerTitle')}
        subtitle={activeCommunity?.name}
        showBackButton={Boolean(onBack)}
        onBack={onBack}
        onClose={onClose}
      />

      <main
        className={joinCSSClassNames(
          screen.screenContainer,
          styles.content,
          canEdit && stickyActions.contentWithStickyActions
        )}
      >
        <section className={styles.summaryCard}>
          <h2 className={typography.heading1}>
            {candidate.label}
          </h2>
          <p className={typography.caption}>
            {candidate.layer.title}
          </p>
        </section>

        <section className={styles.detailsCard}>
          {detailFields.length === 0 ? (
            <p className={joinCSSClassNames(typography.caption, styles.emptyState)}>
              {t('layers.directContribution.details.noAttributes')}
            </p>
          ) : (
            <div className={styles.detailsList}>
              {detailFields.map((field) => (
                <div key={field.name} className={styles.detailRow}>
                  <span
                    className={joinCSSClassNames(
                      typography.caption,
                      styles.detailLabel
                    )}
                  >
                    {field.label}
                  </span>
                  <span
                    className={joinCSSClassNames(
                      typography.body,
                      styles.detailValue
                    )}
                  >
                    {field.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

      </main>

      {canEdit ? (
        <footer className={stickyActions.bar}>
          <Button type='button' fullWidth onClick={onEdit}>
            {t('layers.directContribution.details.editButton')}
          </Button>
        </footer>
      ) : null}
    </SlideUpPage>
  );
}
