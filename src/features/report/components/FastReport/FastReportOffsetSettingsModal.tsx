import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { FastReportGpsSettings, RecordingIntervalUnit } from '@/features/report/types/fastReportGps';
import type { TraceTransportMode } from '@/features/report/constants/reportTrace.constants';
import { Alert } from '@/shared/ui/Alert';
import { Toggle } from '@/shared/ui/Toggle';
import { isFiniteNumber, isNonNegativeFinite, parseDecimalInput } from '@/shared/utils/number';

import IconReset from "@/shared/assets/icons/icon-reset.svg?react";

import styles from './FastReportOffsetSettingsModal.module.css';

interface FastReportOffsetSettingsModalProps {
  isOpen: boolean;
  settings: FastReportGpsSettings;
  transportMode: TraceTransportMode;
  onSave: (settings: FastReportGpsSettings) => Promise<void>;
  onClose: () => void;
}

interface OffsetRowProps {
  enabled: boolean;
  label: string;
  value: string;
  onEnabledChange: (enabled: boolean) => void;
  onValueChange: (value: string) => void;
}

function reverseInputValue(value: string): string {
  const parsedValue = parseDecimalInput(value);
  if (!isFiniteNumber(parsedValue)) return value;
  return String(parsedValue * -1);
}

function OffsetRow({
  enabled,
  label,
  value,
  onEnabledChange,
  onValueChange,
}: OffsetRowProps) {
  return (
    <div className={styles.row}>
      <Toggle
        checked={enabled}
        onChange={onEnabledChange}
      />
      <span>{label}</span>
      <input
        className={styles.numberInput}
        type="number"
        step="0.01"
        value={value}
        disabled={!enabled}
        onChange={(event) => onValueChange(event.target.value)}
      />
      <button
        type="button"
        className={styles.signButton}
        disabled={!enabled}
        onClick={() => onValueChange(reverseInputValue(value))}
      >
        <IconReset className={styles.resetIcon} />
      </button>
    </div>
  );
}

export function FastReportOffsetSettingsModal({
  isOpen,
  settings,
  transportMode,
  onSave,
  onClose,
}: FastReportOffsetSettingsModalProps) {
  const { t } = useTranslation();
  const modeSettings = settings.offsetByMode[transportMode];
  const recordingInterval = settings.recordingIntervalByMode[transportMode];
  const isCarMode = transportMode === 'car';
  const [isSaving, setIsSaving] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isPlanimetricEnabled, setIsPlanimetricEnabled] = useState(modeSettings.planimetric.enabled);
  const [planimetricValue, setPlanimetricValue] = useState(String(modeSettings.planimetric.value));
  const [isAltimetricEnabled, setIsAltimetricEnabled] = useState(modeSettings.altimetric.enabled);
  const [altimetricValue, setAltimetricValue] = useState(String(modeSettings.altimetric.value));
  const [toleranceValue, setToleranceValue] = useState(String(settings.toleranceByMode[transportMode]));
  const [recordingIntervalValue, setRecordingIntervalValue] = useState(String(recordingInterval.value));
  const [recordingIntervalUnit, setRecordingIntervalUnit] = useState<RecordingIntervalUnit>(recordingInterval.unit);
  const settingsKey = [
    transportMode,
    modeSettings.planimetric.enabled,
    modeSettings.planimetric.value,
    modeSettings.altimetric.enabled,
    modeSettings.altimetric.value,
    settings.toleranceByMode[transportMode],
    recordingInterval.value,
    recordingInterval.unit,
  ].join('|');
  const [wasOpen, setWasOpen] = useState(isOpen);
  const [syncedSettingsKey, setSyncedSettingsKey] = useState(settingsKey);
  if (!isOpen) {
    if (wasOpen) setWasOpen(false);
  } else if (!wasOpen || syncedSettingsKey !== settingsKey) {
    setWasOpen(true);
    setSyncedSettingsKey(settingsKey);
    setHasError(false);
    setIsPlanimetricEnabled(modeSettings.planimetric.enabled);
    setPlanimetricValue(String(modeSettings.planimetric.value));
    setIsAltimetricEnabled(modeSettings.altimetric.enabled);
    setAltimetricValue(String(modeSettings.altimetric.value));
    setToleranceValue(String(settings.toleranceByMode[transportMode]));
    setRecordingIntervalValue(String(recordingInterval.value));
    setRecordingIntervalUnit(recordingInterval.unit);
  }

  const save = async () => {
    const parsedPlanimetricValue = parseDecimalInput(planimetricValue);
    const parsedAltimetricValue = parseDecimalInput(altimetricValue);
    const parsedToleranceValue = parseDecimalInput(toleranceValue);
    const parsedRecordingIntervalValue = Number(recordingIntervalValue);

    if (
      !isFiniteNumber(parsedPlanimetricValue) ||
      !isFiniteNumber(parsedAltimetricValue) ||
      !isNonNegativeFinite(parsedToleranceValue) ||
      !Number.isInteger(parsedRecordingIntervalValue) ||
      parsedRecordingIntervalValue < 1
    ) {
      setHasError(true);
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        ...settings,
        offsetByMode: {
          ...settings.offsetByMode,
          [transportMode]: {
            planimetric: {
              enabled: isCarMode && isPlanimetricEnabled,
              value: parsedPlanimetricValue,
            },
            altimetric: {
              enabled: isAltimetricEnabled,
              value: parsedAltimetricValue,
            },
          },
        },
        toleranceByMode: {
          ...settings.toleranceByMode,
          [transportMode]: parsedToleranceValue,
        },
        recordingIntervalByMode: {
          ...settings.recordingIntervalByMode,
          [transportMode]: {
            value: parsedRecordingIntervalValue,
            unit: recordingIntervalUnit,
          },
        },
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Alert
      isOpen={isOpen}
      onClose={onClose}
      title={t('reports.fastReport.offset.title')}
      subtitle={t(`reports.fastReport.offset.mode.${transportMode}`)}
      buttons={[
        {
          label: t('common.cancel'),
          onClick: onClose,
          variant: 'outline',
        },
        {
          label: t('common.save'),
          onClick: () => void save(),
          loading: isSaving,
        },
      ]}
    >
      <div className={styles.form}>
        {isCarMode && (
          <OffsetRow
            enabled={isPlanimetricEnabled}
            label={t('reports.fastReport.offset.planimetric')}
            value={planimetricValue}
            onEnabledChange={setIsPlanimetricEnabled}
            onValueChange={setPlanimetricValue}
          />
        )}

        <OffsetRow
          enabled={isAltimetricEnabled}
          label={t('reports.fastReport.offset.altimetric')}
          value={altimetricValue}
          onEnabledChange={setIsAltimetricEnabled}
          onValueChange={setAltimetricValue}
        />

        <label className={styles.toleranceRow}>
          <span>{t('reports.fastReport.offset.tolerance')}</span>
          <input
            className={styles.numberInput}
            type="number"
            min="0"
            step="0.1"
            value={toleranceValue}
            onChange={(event) => setToleranceValue(event.target.value)}
          />
        </label>

        <label className={styles.recordingIntervalRow}>
          <span>{t('reports.fastReport.offset.recordingInterval')}</span>
          <input
            className={styles.numberInput}
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={recordingIntervalValue}
            onChange={(event) => setRecordingIntervalValue(event.target.value)}
          />
          <select
            className={styles.unitSelect}
            value={recordingIntervalUnit}
            aria-label={t('reports.fastReport.offset.recordingIntervalUnit')}
            onChange={(event) => setRecordingIntervalUnit(event.target.value as RecordingIntervalUnit)}
          >
            <option value="seconds">{t('reports.fastReport.offset.unit.seconds')}</option>
            <option value="meters">{t('reports.fastReport.offset.unit.meters')}</option>
          </select>
        </label>

        {hasError && (
          <p className={styles.error}>{t('reports.fastReport.offset.invalidNumber')}</p>
        )}
      </div>
    </Alert>
  );
}
