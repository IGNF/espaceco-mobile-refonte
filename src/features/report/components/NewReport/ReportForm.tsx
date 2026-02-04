import { useTranslation } from 'react-i18next';
import { Checkbox } from '@/shared/ui/Checkbox';
import type { UseReportFormReturn } from '@/features/report/hooks/useReportForm';
import type { CommunityThemeAttribute } from '@/domain/community/models';
import type { Position } from '@/platform/device/geolocation';

import IconLocation from '@/shared/assets/icons/icon-location.svg?react';
import IconCamera from '@/shared/assets/icons/icon-camera.svg?react';
import IconObject from '@/shared/assets/icons/icon-object.svg?react';
import IconPencil from '@/shared/assets/icons/icon-pencil.svg?react';

import inputs from '@/shared/styles/inputs.module.css';
import styles from './ReportForm.module.css';

export interface ReportFormProps {
  form: UseReportFormReturn;
  position: Position | null;
  isLocating: boolean;
}

export function ReportForm({ form, position, isLocating }: ReportFormProps) {
  const { t } = useTranslation();

  const renderPositionCard = () => {
    let content: string;
    if (isLocating) {
      content = t('reports.createOrEdit.form.positionLocating');
    } else if (position) {
      const lon = position.coords.longitude.toFixed(6);
      const lat = position.coords.latitude.toFixed(6);
      content = `${lon}, ${lat}`;
    } else {
      content = t('reports.createOrEdit.form.positionUnavailable');
    }

    return (
      <div className={styles.section}>
        <h2 className={styles.sectionLabel}>{t('reports.createOrEdit.form.position')}</h2>
        <div className={styles.positionCard}>
          <IconLocation className={styles.positionIcon} />
          <span className={styles.positionText}>{content}</span>
        </div>
      </div>
    );
  };

  const renderLabel = (text: string, required?: boolean, htmlFor?: string) => (
    <label className={inputs.label} htmlFor={htmlFor}>
      {text}
      {required && <span className={inputs.required}> *</span>}
    </label>
  );

  const renderError = (error?: string) =>
    error ? <span className={inputs.error}>{error}</span> : null;

  const renderAttributeField = (attr: CommunityThemeAttribute) => {
    const value = form.attributeValues[attr.name] ?? '';
    const error = form.errors[attr.name];
    const fieldId = `attr-${attr.name.replace(/\s+/g, '-').toLowerCase()}`;

    switch (attr.type) {
      case 'list':
        return (
          <div key={attr.name} className={inputs.field}>
            {renderLabel(attr.name, attr.mandatory, fieldId)}
            <select
              id={fieldId}
              className={`${inputs.select} ${error ? inputs.inputError : ''}`}
              value={value}
              onChange={e => form.setAttributeValue(attr.name, e.target.value)}
            >
              <option value="" disabled />
              {(attr.values ?? []).map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
            {renderError(error)}
          </div>
        );

      case 'checkbox':
        return (
          <div key={attr.name} className={styles.checkboxField}>
            <Checkbox
              label={attr.name}
              checked={value === '1'}
              onChange={checked => form.setAttributeValue(attr.name, checked ? '1' : '0')}
            />
            {renderError(error)}
          </div>
        );

      case 'date':
        return (
          <div key={attr.name} className={inputs.field}>
            {renderLabel(attr.name, attr.mandatory, fieldId)}
            <input
              id={fieldId}
              type="date"
              className={`${inputs.input} ${error ? inputs.inputError : ''}`}
              value={value}
              onChange={e => form.setAttributeValue(attr.name, e.target.value)}
            />
            {renderError(error)}
          </div>
        );

      case 'integer':
        return (
          <div key={attr.name} className={inputs.field}>
            {renderLabel(attr.name, attr.mandatory, fieldId)}
            <input
              id={fieldId}
              type="number"
              step="1"
              className={`${inputs.input} ${error ? inputs.inputError : ''}`}
              value={value}
              onChange={e => form.setAttributeValue(attr.name, e.target.value)}
            />
            {renderError(error)}
          </div>
        );

      case 'double':
        return (
          <div key={attr.name} className={inputs.field}>
            {renderLabel(attr.name, attr.mandatory, fieldId)}
            <input
              id={fieldId}
              type="number"
              step="0.01"
              className={`${inputs.input} ${error ? inputs.inputError : ''}`}
              value={value}
              onChange={e => form.setAttributeValue(attr.name, e.target.value)}
            />
            {renderError(error)}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={styles.form}>
      {/* Position */}
      {renderPositionCard()}

      {/* Theme */}
      <div className={styles.section}>
        <div className={inputs.field}>
          {renderLabel(t('reports.createOrEdit.form.theme'), true, 'theme-select')}
          <select
            id="theme-select"
            className={`${inputs.select} ${form.errors.theme ? inputs.inputError : ''}`}
            value={form.selectedTheme}
            onChange={e => form.setSelectedTheme(e.target.value)}
          >
            <option value="" disabled>
              {t('reports.createOrEdit.form.themePlaceholder')}
            </option>
            {form.themes.map(tc => (
              <option key={tc.theme} value={tc.theme}>{tc.theme}</option>
            ))}
          </select>
          {renderError(form.errors.theme)}
        </div>
      </div>

      {/* Dynamic Attributes */}
      {form.currentAttributes.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionLabel}>{t('reports.createOrEdit.form.attributes')}</h2>
          <div className={styles.attributeFields}>
            {form.currentAttributes.map(renderAttributeField)}
          </div>
        </div>
      )}

      {/* Comment */}
      <div className={styles.section}>
        <div className={inputs.field}>
          {renderLabel(t('reports.createOrEdit.form.comment'), false, 'comment-textarea')}
          <textarea
            id="comment-textarea"
            className={inputs.textarea}
            value={form.comment}
            onChange={e => form.setComment(e.target.value)}
            placeholder={t('reports.createOrEdit.form.commentPlaceholder')}
            rows={4}
          />
        </div>
      </div>

      {/* Attachment placeholders */}
      <div className={styles.section}>
        <div className={styles.attachmentPlaceholder}>
          <IconCamera className={styles.attachmentIcon} />
          <div className={styles.attachmentInfo}>
            <span className={styles.attachmentLabel}>{t('reports.createOrEdit.form.photo')}</span>
            <span className={styles.attachmentHint}>{t('reports.createOrEdit.form.photoAdd')}</span>
          </div>
          <span className={styles.comingSoon}>{t('reports.createOrEdit.form.comingSoon')}</span>
        </div>

        <div className={styles.attachmentPlaceholder}>
          <IconObject className={styles.attachmentIcon} />
          <div className={styles.attachmentInfo}>
            <span className={styles.attachmentLabel}>{t('reports.createOrEdit.form.object')}</span>
            <span className={styles.attachmentHint}>{t('reports.createOrEdit.form.objectAdd')}</span>
          </div>
          <span className={styles.comingSoon}>{t('reports.createOrEdit.form.comingSoon')}</span>
        </div>

        <div className={styles.attachmentPlaceholder}>
          <IconPencil className={styles.attachmentIcon} />
          <div className={styles.attachmentInfo}>
            <span className={styles.attachmentLabel}>{t('reports.createOrEdit.form.sketch')}</span>
            <span className={styles.attachmentHint}>{t('reports.createOrEdit.form.sketchAdd')}</span>
          </div>
          <span className={styles.comingSoon}>{t('reports.createOrEdit.form.comingSoon')}</span>
        </div>
      </div>
    </div>
  );
}
