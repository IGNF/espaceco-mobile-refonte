import { useMemo, useRef, useState } from 'react';
import { getUid } from 'ol/util';
import type { Table } from '@ign/mobile-core';
import type Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  applyDirectContributionAsyncFieldEffects,
  applyDirectContributionFieldEffects,
  clearDirectContributionDocumentValue,
  getDirectContributionFieldDefinitions,
  getDirectContributionInitialValues,
  getDirectContributionResolvedFieldDefinitions,
  incrementDirectContributionLikeValue,
  setDirectContributionDocumentFile,
  type DirectContributionFieldDefinition,
  type DirectContributionFieldValue,
  type DirectContributionResolvedFieldDefinition,
  toDirectContributionDocumentValue,
  toDirectContributionLikeValue,
  validateAndNormalizeDirectContributionFieldValue,
} from '@/domain/community/directContributionForm';
import { SlideUpPage } from '@/shared/ui/SlideUpPage';
import { Button } from '@/shared/ui/Button';
import { toStringArrayFieldValue, toStringFieldValue } from '@/shared/utils/coercion';
import { joinCSSClassNames } from '@/shared/utils/join';

import IconArrowLeft from '@/shared/assets/icons/icon-arrow-left.svg?react';
import IconClose from '@/shared/assets/icons/icon-close.svg?react';

import typography from '@/shared/styles/typography.module.css';
import inputs from '@/shared/styles/inputs.module.css';
import styles from './DirectContributionFeatureFormPage.module.css';

interface DirectContributionFeatureFormContentProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  table: Table;
  feature: Feature<Geometry>;
  onSave: (attributes: Record<string, unknown>) => void | Promise<void>;
  onCancel: () => void;
}

interface DirectContributionFeatureFormPageProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  table: Table | null;
  feature: Feature<Geometry> | null;
  onSave: (attributes: Record<string, unknown>) => void | Promise<void>;
  onCancel: () => void;
}

/** Maps legacy collaborative field kinds to the closest HTML input type. */
function getInputType(field: DirectContributionFieldDefinition): string {
  switch (field.kind) {
    case 'number':
    case 'year':
      return 'number';
    case 'date':
      return 'date';
    case 'datetime':
      return 'datetime-local';
    case 'month':
      return 'month';
    default:
      return 'text';
  }
}

function DirectContributionFeatureFormContent({
  isOpen,
  mode,
  table,
  feature,
  onSave,
  onCancel,
}: DirectContributionFeatureFormContentProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const fields = useMemo(
    () => getDirectContributionFieldDefinitions(table),
    [table]
  );
  const [values, setValues] = useState<Record<string, DirectContributionFieldValue>>(() =>
    getDirectContributionInitialValues(table, feature, fields, userId)
  );
  const resolvedFields = useMemo(
    () => getDirectContributionResolvedFieldDefinitions(fields, values),
    [fields, values]
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const asyncEffectsRequestIdRef = useRef(0);

  const headerTitle = mode === 'create'
    ? t('layers.directContribution.form.headerTitleCreate')
    : t('layers.directContribution.form.headerTitleEdit');

  const handleValueChange = (fieldName: string, nextValue: DirectContributionFieldValue) => {
    const nextValues = applyDirectContributionFieldEffects(
      fields,
      {
        ...values,
        [fieldName]: nextValue,
      },
      fieldName,
      userId
    );

    setValues(nextValues);
    setErrors({});

    const requestId = ++asyncEffectsRequestIdRef.current;

    // Some document-driven rules may need asynchronous metadata reads (for example EXIF date extraction on photos).
    // Keep only the latest result so an older file read cannot overwrite a newer user change.
    void applyDirectContributionAsyncFieldEffects(
      fields,
      nextValues,
      fieldName,
      userId
    ).then((asyncValues) => {
      if (requestId !== asyncEffectsRequestIdRef.current) {
        return;
      }

      setValues(asyncValues);
    });
  };

  const handleSave = async () => {
    const nextErrors: Record<string, string> = {};
    const normalizedAttributes: Record<string, unknown> = {};
    setSubmitError(null);

    // The form keeps display-friendly values. Normalize them once here before updating the collaborative feature, so field components stay simple.
    for (const field of resolvedFields) {
      if (field.disabled) {
        continue;
      }

      const rawValue = values[field.name] ?? '';
      const { normalizedValue, error } = validateAndNormalizeDirectContributionFieldValue(
        field,
        rawValue,
        { t }
      );

      if (error) {
        nextErrors[field.name] = error;
        continue;
      }

      normalizedAttributes[field.name] = normalizedValue;
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(normalizedAttributes);
    } catch {
      setSubmitError(t('layers.directContribution.form.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const renderFieldControl = (
    field: DirectContributionResolvedFieldDefinition,
    error?: string
  ) => {
    const value = values[field.name] ?? '';
    const disabled = field.disabled || isSaving;

    if (field.kind === 'select') {
      return (
        <select
          id={field.name}
          className={joinCSSClassNames(
            inputs.select,
            styles.select,
            error && inputs.inputError
          )}
          value={toStringFieldValue(value)}
          onChange={(event) => handleValueChange(field.name, event.target.value)}
          disabled={disabled}
        >
          <option value="">
            {field.placeholder ?? t('layers.directContribution.form.chooseOption')}
          </option>
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    if (field.kind === 'multiselect') {
      return (
        <select
          id={field.name}
          multiple
          size={Math.min(Math.max((field.options ?? []).length, 3), 6)}
          className={joinCSSClassNames(
            inputs.select,
            styles.select,
            styles.multiselect,
            error && inputs.inputError
          )}
          value={toStringArrayFieldValue(value)}
          onChange={(event) => {
            handleValueChange(
              field.name,
              Array.from(event.target.selectedOptions, (option) => option.value)
            )
          }}
          disabled={disabled}
        >
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    if (field.kind === 'document') {
      const documentValue = toDirectContributionDocumentValue(value);
      const statusText = documentValue.file
        ? t('layers.directContribution.form.document.selected', { value: documentValue.file.name })
        : documentValue.documentId && !documentValue.removed
          ? t('layers.directContribution.form.document.current', { value: documentValue.documentId })
          : t('layers.directContribution.form.document.empty');

      return (
        <div className={styles.documentField}>
          <p className={styles.documentStatus}>{statusText}</p>
          <input
            key={`${field.name}-${documentValue.documentId ?? 'none'}-${documentValue.file?.name ?? 'nofile'}-${documentValue.removed ? 'removed' : 'kept'}`}
            id={field.name}
            type="file"
            accept={field.accept}
            className={joinCSSClassNames(
              inputs.input,
              styles.input,
              styles.documentInput,
              error && inputs.inputError
            )}
            onChange={(event) => {
              handleValueChange(
                field.name,
                setDirectContributionDocumentFile(documentValue, event.target.files?.[0] ?? null)
              )
            }}
            disabled={disabled}
          />
          {((documentValue.documentId && !documentValue.removed) || documentValue.file) && (
            <Button
              type="button"
              color="medium"
              variant="outline"
              className={styles.inlineActionButton}
              onClick={() => handleValueChange(field.name, clearDirectContributionDocumentValue(documentValue))}
              disabled={disabled}
            >
              {t('layers.directContribution.form.document.remove')}
            </Button>
          )}
        </div>
      );
    }

    if (field.kind === 'like') {
      const likeValue = toDirectContributionLikeValue(value, userId);

      return (
        <div className={styles.likeField}>
          <input
            id={field.name}
            type="text"
            className={joinCSSClassNames(inputs.input, styles.input)}
            value={likeValue.validDate ?? ''}
            disabled
            placeholder={field.placeholder}
          />
          <div className={styles.likeActions}>
            <Button
              type="button"
              color="primary"
              variant="outline"
              className={styles.inlineActionButton}
              onClick={() => handleValueChange(field.name, incrementDirectContributionLikeValue(likeValue, userId))}
              disabled={disabled}
            >
              {t('layers.directContribution.form.like.action')}
            </Button>
            <span className={styles.likeCount}>
              {t('layers.directContribution.form.like.count', { count: likeValue.cnt })}
            </span>
          </div>
        </div>
      );
    }

    if (field.kind === 'json') {
      return (
        <textarea
          id={field.name}
          className={joinCSSClassNames(
            inputs.textarea,
            styles.textarea,
            error && inputs.inputError
          )}
          value={toStringFieldValue(value)}
          onChange={(event) => handleValueChange(field.name, event.target.value)}
          disabled={disabled}
          placeholder={field.placeholder ?? t('layers.directContribution.form.json.placeholder')}
        />
      );
    }

    return (
      <input
        id={field.name}
        type={getInputType(field)}
        className={joinCSSClassNames(
          inputs.input,
          styles.input,
          error && inputs.inputError
        )}
        value={toStringFieldValue(value)}
        onChange={(event) => handleValueChange(field.name, event.target.value)}
        disabled={disabled}
        placeholder={field.placeholder}
        min={field.min}
        max={field.max}
        step={field.step}
      />
    );
  };

  return (
    <SlideUpPage
      isOpen={isOpen}
      onClose={onCancel}
      level={2}
    >
      <div className={styles.page}>
        <header className={styles.header}>
          <Button
            type="button"
            color="medium"
            variant="ghost"
            className={styles.headerButton}
            onClick={onCancel}
            aria-label={t('layers.directContribution.form.back')}
          >
            <IconArrowLeft className={styles.headerIcon} />
          </Button>

          <div className={styles.headerTitles}>
            <h1 className={styles.headerTitle}>{headerTitle}</h1>
            <p className={styles.headerSubtitle}>{t('layers.directContribution.form.headerSubtitle')}</p>
          </div>

          <Button
            type="button"
            color="medium"
            variant="ghost"
            className={styles.headerButton}
            onClick={onCancel}
            aria-label={t('layers.directContribution.form.close')}
          >
            <IconClose className={styles.headerIcon} />
          </Button>
        </header>

        <main className={styles.content}>
          <div className={styles.titleSection}>
            <h2 className={joinCSSClassNames(typography.title, styles.title)}>
              {t('layers.directContribution.form.title')}
            </h2>
          </div>

          <form
            className={styles.form}
            onSubmit={async (event) => {
              event.preventDefault();
              await handleSave();
            }}
          >
            {resolvedFields.map((field) => {
              const error = errors[field.name];

              return (
                <div
                  key={field.name}
                  className={joinCSSClassNames(inputs.field, styles.field)}
                >
                  <label
                    className={joinCSSClassNames(inputs.label, styles.label)}
                    htmlFor={field.name}
                  >
                    {field.label}
                    {field.required && <span className={inputs.required}> *</span>}
                  </label>

                  {renderFieldControl(field, error)}

                  {error && (
                    <p className={joinCSSClassNames(inputs.error, styles.error)}>{error}</p>
                  )}
                </div>
              );
            })}

            {submitError && (
              <p className={joinCSSClassNames(inputs.error, styles.error, styles.submitError)}>
                {submitError}
              </p>
            )}
          </form>
        </main>

        <footer className={styles.actions}>
          <Button
            type="button"
            color="primary"
            className={styles.actionButton}
            onClick={() => {
              void handleSave();
            }}
            fullWidth
            loading={isSaving}
            disabled={isSaving}
          >
            {t('layers.directContribution.form.actions.save')}
          </Button>
          <Button
            type="button"
            color="primary"
            variant="outline"
            className={styles.actionButton}
            onClick={onCancel}
            fullWidth
            disabled={isSaving}
          >
            {t('layers.directContribution.form.actions.cancel')}
          </Button>
        </footer>
      </div>
    </SlideUpPage>
  );
}

export function DirectContributionFeatureFormPage({
  isOpen,
  mode,
  table,
  feature,
  onSave,
  onCancel,
}: DirectContributionFeatureFormPageProps) {
  if (!table || !feature) {
    return null;
  }

  const featureKey = feature.getId() ?? getUid(feature);

  return (
    // Remount the inner form when the edited feature changes so local form
    // state is rebuilt from the new feature attributes.
    <DirectContributionFeatureFormContent
      key={`${mode}-${String(featureKey)}`}
      isOpen={isOpen}
      mode={mode}
      table={table}
      feature={feature}
      onSave={onSave}
      onCancel={onCancel}
    />
  );
}
