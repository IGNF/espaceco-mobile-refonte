import { useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import inputs from '@/shared/styles/inputs.module.css';
import { Button } from '@/shared/ui/Button';
import { Segment } from '@/shared/ui/Segment';
import { joinCSSClassNames } from '@/shared/utils/join';

import { FORMAT_FIELDS, convertCoordinateFields, parseCoordinate } from '../utils/coordinates';
import type {
  CoordinateAxis,
  CoordinateError,
  CoordinateField,
  CoordinateFields,
  CoordinateFormat,
} from '../utils/coordinates';
import styles from './CoordinateSearchForm.module.css';

const AXES: CoordinateAxis[] = ['latitude', 'longitude'];

const HEMISPHERES: Record<CoordinateAxis, CoordinateFields['hemisphere'][]> = {
  latitude: ['N', 'S'],
  longitude: ['E', 'W'],
};

const FIELD_UNITS: Record<CoordinateField, string> = {
  decimal: '°',
  degrees: '°',
  minutes: '′',
  seconds: '″',
};

const EMPTY_VALUES = { decimal: '', degrees: '', minutes: '', seconds: '' };

export interface CoordinateSearchFormProps {
  onLocate: (longitude: number, latitude: number) => void;
}

/**
 * WGS84 coordinate entry, in decimal degrees or degrees/minutes/seconds.
 */
export function CoordinateSearchForm({ onLocate }: CoordinateSearchFormProps) {
  const { t } = useTranslation();
  const [format, setFormat] = useState<CoordinateFormat>('decimal');
  const [fields, setFields] = useState<Record<CoordinateAxis, CoordinateFields>>({
    latitude: { hemisphere: 'N', ...EMPTY_VALUES },
    longitude: { hemisphere: 'E', ...EMPTY_VALUES },
  });
  const [errors, setErrors] = useState<Partial<Record<CoordinateAxis, CoordinateError>>>({});

  const handleFormatChange = (nextFormat: CoordinateFormat) => {
    setFormat(nextFormat);
    setFields({
      latitude: convertCoordinateFields('latitude', nextFormat, fields.latitude),
      longitude: convertCoordinateFields('longitude', nextFormat, fields.longitude),
    });
    setErrors({});
  };

  const updateAxis = (axis: CoordinateAxis, axisFields: CoordinateFields) => {
    setFields({ ...fields, [axis]: axisFields });
    setErrors({ ...errors, [axis]: undefined });
  };

  const handleValueChange = (axis: CoordinateAxis, field: CoordinateField, value: string) => {
    // A minus sign (Android keyboard or pasted value) selects the S or W hemisphere instead.
    if (value.startsWith('-')) {
      updateAxis(axis, { ...fields[axis], [field]: value.slice(1), hemisphere: axis === 'latitude' ? 'S' : 'W' });
    } else {
      updateAxis(axis, { ...fields[axis], [field]: value });
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const latitude = parseCoordinate('latitude', format, fields.latitude);
    const longitude = parseCoordinate('longitude', format, fields.longitude);
    if (latitude.error || longitude.error) {
      setErrors({ latitude: latitude.error, longitude: longitude.error });
      return;
    }
    // Close the on-screen keyboard so the located point is visible.
    (document.activeElement as HTMLElement).blur();
    onLocate(longitude.value, latitude.value);
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <Segment
        value={format}
        options={[
          { value: 'decimal', label: t('search.coordinates.formatDecimal') },
          { value: 'dms', label: t('search.coordinates.formatDms') },
        ]}
        onChange={handleFormatChange}
        ariaLabel={t('search.coordinates.formatLabel')}
      />

      {AXES.map((axis) => {
        const axisLabel = t(`search.coordinates.${axis}`);
        const error = errors[axis];

        return (
          <fieldset key={axis} className={styles.axis}>
            <legend className={joinCSSClassNames(inputs.label, styles.legend)}>{axisLabel}</legend>
            <div className={styles.row}>
              {FORMAT_FIELDS[format].map((field) => (
                <label key={field} className={joinCSSClassNames(styles.part, field === 'seconds' && styles.seconds)}>
                  <input
                    type="text"
                    inputMode="decimal"
                    className={joinCSSClassNames(inputs.input, styles.input, error?.field === field && inputs.inputError)}
                    value={fields[axis][field]}
                    placeholder={field === 'decimal' ? t(`search.coordinates.${axis}Placeholder`) : undefined}
                    aria-label={field === 'decimal' ? axisLabel : `${axisLabel}, ${t(`search.coordinates.${field}`)}`}
                    onChange={(event) => handleValueChange(axis, field, event.target.value)}
                  />
                  <span className={styles.unit} aria-hidden="true">{FIELD_UNITS[field]}</span>
                </label>
              ))}
              <Segment
                className={styles.hemisphere}
                value={fields[axis].hemisphere}
                options={HEMISPHERES[axis].map((hemisphere) => ({
                  value: hemisphere,
                  label: t(`search.coordinates.hemispheres.${hemisphere}`),
                }))}
                onChange={(hemisphere) => updateAxis(axis, { ...fields[axis], hemisphere })}
                ariaLabel={t(`search.coordinates.${axis}Hemisphere`)}
              />
            </div>
            {error && <p className={inputs.error}>{t(`search.coordinates.errors.${error.code}`)}</p>}
          </fieldset>
        );
      })}

      <Button type="submit" fullWidth>
        {t('search.coordinates.submit')}
      </Button>
    </form>
  );
}
