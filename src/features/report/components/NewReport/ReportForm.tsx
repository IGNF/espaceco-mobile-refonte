import { useTranslation } from 'react-i18next';
import { Checkbox } from '@/shared/ui/Checkbox';
import { Button } from '@/shared/ui/Button';
import { AttachmentSection } from '@/features/report/components/NewReport/AttachmentSection';
import type { UseReportFormReturn } from '@/features/report/hooks/useReportForm';
import type { CommunityThemeAttribute } from '@/domain/community/models';
import type { Position } from '@/platform/device/geolocation';
import { getGeometryLabelKeyFromType } from '@/shared/utils/geometry';
import type LineString from 'ol/geom/LineString';
import {
  getReportObjectKey,
  getReportObjectLabel,
  getReportObjectLayerTitle,
} from '@/features/report/utils/reportObjects';

import IconLocation from '@/shared/assets/icons/icon-location.svg?react';
import IconCamera from '@/shared/assets/icons/icon-camera.svg?react';
import IconObject from '@/shared/assets/icons/icon-object.svg?react';
import IconPencil from '@/shared/assets/icons/icon-pencil.svg?react';
import IconTrack from '@/shared/assets/icons/icon-track.svg?react';
import IconClose from '@/shared/assets/icons/icon-close.svg?react';

import inputs from '@/shared/styles/inputs.module.css';
import styles from './ReportForm.module.css';

export interface ReportFormProps {
  form: UseReportFormReturn;
  position: Position | null;
  isLocating: boolean;
  isTraceMode?: boolean;
  onEditPosition?: () => void;
  onAddObject?: () => void;
  onAddSketch?: () => void;
  onAddTrace?: () => void;
  isPickingObject?: boolean;
  isPickingSketch?: boolean;
  isPickingTrace?: boolean;
}

export function ReportForm({
  form,
  position,
  isLocating,
  isTraceMode = false,
  onEditPosition,
  onAddObject,
  onAddSketch,
  onAddTrace,
  isPickingObject = false,
  isPickingSketch = false,
  isPickingTrace = false,
}: ReportFormProps) {
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
          {onEditPosition && (
            <Button
              type="button"
              color="medium"
              variant="ghost"
              className={styles.positionEditButton}
              onClick={onEditPosition}
              aria-label={t('reports.createOrEdit.form.editPosition')}
            >
              <IconPencil className={styles.positionEditIcon} />
            </Button>
          )}
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

  const renderTraceCard = () => {
    const traceAction = onAddTrace
      ? {
        label: isPickingTrace
          ? t('reports.createOrEdit.form.traceRecording')
          : t('reports.createOrEdit.form.traceAdd'),
        onClick: onAddTrace,
      }
      : undefined;

    const traceFeature = form.sketches[0];
    const traceGeometry = traceFeature?.getGeometry();
    const tracePointCount = traceGeometry?.getType() === 'LineString'
      ? (traceGeometry as LineString).getCoordinates().length
      : 0;

    return (
      <AttachmentSection
        Icon={IconTrack}
        label={t('reports.createOrEdit.form.trace')}
        badge={t('reports.createOrEdit.form.traceCount', { count: form.sketches.length })}
        hasContent={form.sketches.length > 0}
        emptyText={t('reports.createOrEdit.form.traceEmpty')}
        action={traceAction}
      >
        {form.sketches.length > 0 && (
          <div className={styles.objectList}>
            <div className={styles.objectItem}>
              <div className={styles.objectItemInfo}>
                <span className={styles.objectItemLabel}>
                  {t('reports.createOrEdit.form.traceItem', { pointCount: tracePointCount })}
                </span>
                <span className={styles.objectItemLayer}>
                  {t('geometry.types.lineString')}
                </span>
              </div>
              <button
                type="button"
                className={styles.objectRemoveButton}
                onClick={() => form.replaceSketches([])}
                aria-label={t('reports.createOrEdit.form.traceRemove')}
              >
                <IconClose className={styles.objectRemoveIcon} />
              </button>
            </div>
          </div>
        )}
        {renderError(form.errors.trace)}
      </AttachmentSection>
    );
  };

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

  const renderObjectCard = () => {
    const objectAction = onAddObject
      ? {
        label: isPickingObject
          ? t('reports.createOrEdit.form.objectPicking')
          : t('reports.createOrEdit.form.objectAdd'),
        onClick: onAddObject,
      }
      : undefined;

    return (
      <AttachmentSection
        Icon={IconObject}
        label={t('reports.createOrEdit.form.object')}
        badge={t('reports.createOrEdit.form.objectCount', { count: form.objects.length })}
        hasContent={form.objects.length > 0}
        emptyText={t('reports.createOrEdit.form.objectEmpty')}
        action={objectAction}
      >
        {form.objects.length > 0 && (
          <div className={styles.objectList}>
            {form.objects.map((feature, index) => {
              const objectKey = getReportObjectKey(feature) ?? `object-${index}`;
              const label =
                getReportObjectLabel(feature) ??
                t('reports.createOrEdit.form.objectDefaultName');
              const layerTitle =
                getReportObjectLayerTitle(feature) ??
                t('reports.createOrEdit.form.objectLayerUnknown');

              return (
                <div key={objectKey} className={styles.objectItem}>
                  <div className={styles.objectItemInfo}>
                    <span className={styles.objectItemLabel}>{label}</span>
                    <span className={styles.objectItemLayer}>{layerTitle}</span>
                  </div>
                  <button
                    type="button"
                    className={styles.objectRemoveButton}
                    onClick={() => form.removeObject(index)}
                    aria-label={t('reports.createOrEdit.form.objectRemove')}
                  >
                    <IconClose className={styles.objectRemoveIcon} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </AttachmentSection>
    );
  };

  const renderSketchCard = () => {
    const sketchAction = onAddSketch
      ? {
        label: isPickingSketch
          ? t('reports.createOrEdit.form.sketchPicking')
          : t('reports.createOrEdit.form.sketchAdd'),
        onClick: onAddSketch,
      }
      : undefined;

    return (
      <AttachmentSection
        Icon={IconPencil}
        label={t('reports.createOrEdit.form.sketch')}
        badge={t('reports.createOrEdit.form.sketchCount', { count: form.sketches.length })}
        hasContent={form.sketches.length > 0}
        emptyText={t('reports.createOrEdit.form.sketchEmpty')}
        action={sketchAction}
      >
        {form.sketches.length > 0 && (
          <div className={styles.objectList}>
            {form.sketches.map((feature, index) => (
              <div key={`sketch-${index}`} className={styles.objectItem}>
                <div className={styles.objectItemInfo}>
                  <span className={styles.objectItemLabel}>
                    {t('reports.createOrEdit.form.sketchItem', { index: index + 1 })}
                  </span>
                  <span className={styles.objectItemLayer}>
                    {t(getGeometryLabelKeyFromType(feature.getGeometry()?.getType()))}
                  </span>
                </div>
                <button
                  type="button"
                  className={styles.objectRemoveButton}
                  onClick={() => form.removeSketch(index)}
                  aria-label={t('reports.createOrEdit.form.sketchRemove')}
                >
                  <IconClose className={styles.objectRemoveIcon} />
                </button>
              </div>
            ))}
          </div>
        )}
      </AttachmentSection>
    );
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
        {isTraceMode ? (
          renderTraceCard()
        ) : (
          <>
            <AttachmentSection
              Icon={IconCamera}
              label={t('reports.createOrEdit.form.photo')}
              badge={t('reports.createOrEdit.form.photoCount', {
                count: form.photos.length,
                max: form.photoLimit,
              })}
              hasContent={form.photos.length > 0}
              emptyText={t('reports.createOrEdit.form.photoEmpty')}
              action={{
                label: t('reports.createOrEdit.form.photoAdd'),
                onClick: form.addPhoto,
                loading: form.isAddingPhoto,
                disabled: form.photos.length >= form.photoLimit,
              }}
            >
              {form.photos.length > 0 && (
                <>
                  <div className={styles.photoGrid}>
                    {form.photos.map((photo, index) => (
                      <div className={styles.photoItem} key={photo.localPath ?? `${index}`}>
                        {photo.thumbnail ? (
                          <img
                            src={photo.thumbnail}
                            alt={t('reports.createOrEdit.form.photoPreviewAlt', { index: index + 1 })}
                            className={styles.photoPreview}
                          />
                        ) : (
                          <div className={styles.photoFallback}>
                            <IconCamera className={styles.photoFallbackIcon} />
                          </div>
                        )}
                        <button
                          type="button"
                          className={styles.photoRemoveButton}
                          onClick={() => form.removePhoto(index)}
                          aria-label={t('reports.createOrEdit.form.photoRemove')}
                        >
                          <IconClose className={styles.photoRemoveIcon} />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </AttachmentSection>

            {renderObjectCard()}
            {renderSketchCard()}
          </>
        )}
      </div>
    </div>
  );
}
