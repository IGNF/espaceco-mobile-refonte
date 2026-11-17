export type CoordinateAxis = 'latitude' | 'longitude';
export type CoordinateFormat = 'decimal' | 'dms';
export type CoordinateField = 'decimal' | 'degrees' | 'minutes' | 'seconds';

/**
 * Raw form values for one axis. Values are unsigned: the sign comes from the hemisphere.
 */
export interface CoordinateFields {
  hemisphere: 'N' | 'S' | 'E' | 'W';
  decimal: string;
  degrees: string;
  minutes: string;
  seconds: string;
}

export interface CoordinateError {
  code:
    | 'required'
    | 'invalidNumber'
    | 'latitudeOutOfRange'
    | 'longitudeOutOfRange'
    | 'minutesRange'
    | 'secondsRange';
  field: CoordinateField;
}

export type CoordinateParseResult =
  | { value: number; error?: undefined }
  | { value?: undefined; error: CoordinateError };

export const FORMAT_FIELDS: Record<CoordinateFormat, CoordinateField[]> = {
  decimal: ['decimal'],
  dms: ['degrees', 'minutes', 'seconds'],
};

/**
 * Parses the form values of one axis into signed WGS84 decimal degrees.
 */
export function parseCoordinate(
  axis: CoordinateAxis,
  format: CoordinateFormat,
  fields: CoordinateFields,
): CoordinateParseResult {
  const values: number[] = [];
  for (const field of FORMAT_FIELDS[format]) {
    const raw = fields[field].trim();
    // In DMS, empty minutes and seconds are read as 0.
    if (!raw && (field === 'minutes' || field === 'seconds')) {
      values.push(0);
      continue;
    }
    if (!raw) return { error: { code: 'required', field } };
    // Unsigned number, with "." or "," as decimal separator.
    if (!/^\d+([.,]\d+)?$/.test(raw)) return { error: { code: 'invalidNumber', field } };
    values.push(Number(raw.replace(',', '.')));
  }

  let absolute = values[0];
  if (format === 'dms') {
    const [degrees, minutes, seconds] = values;
    if (minutes >= 60) return { error: { code: 'minutesRange', field: 'minutes' } };
    if (seconds >= 60) return { error: { code: 'secondsRange', field: 'seconds' } };
    absolute = degrees + minutes / 60 + seconds / 3600;
  }

  if (absolute > (axis === 'latitude' ? 90 : 180)) {
    return { error: { code: `${axis}OutOfRange`, field: FORMAT_FIELDS[format][0] } };
  }

  const isNegative = fields.hemisphere === 'S' || fields.hemisphere === 'W';
  return { value: isNegative ? -absolute : absolute };
}

/**
 * Used when switching format: fills the fields of `toFormat` from the value typed in the other format.
 * Every value is cleared when the typed value is missing or invalid.
 */
export function convertCoordinateFields(
  axis: CoordinateAxis,
  toFormat: CoordinateFormat,
  fields: CoordinateFields,
): CoordinateFields {
  const { value } = parseCoordinate(axis, toFormat === 'decimal' ? 'dms' : 'decimal', fields);
  if (value === undefined) {
    return { ...fields, decimal: '', degrees: '', minutes: '', seconds: '' };
  }

  const absolute = Math.abs(value);
  if (toFormat === 'decimal') {
    // 6 decimals is about 0.1 m. Number() drops the trailing zeros.
    return { ...fields, decimal: String(Number(absolute.toFixed(6))) };
  }

  // Count in hundredths of a second (about 0.3 m) so that 59.999" rounds to 1' 0" instead of 60".
  const hundredths = Math.round(absolute * 360000);
  return {
    ...fields,
    degrees: String(Math.floor(hundredths / 360000)),
    minutes: String(Math.floor((hundredths % 360000) / 6000)),
    seconds: String((hundredths % 6000) / 100),
  };
}
