import { useState, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ReportStatus } from '@ign/mobile-core';
import type { Report } from '@ign/mobile-core';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useCommunity } from '@/features/community/hooks/useCommunity';
import { ReportStorageAdapter } from '@/infra/storage';
import type { CommunityThemeConfig, CommunityThemeAttribute } from '@/domain/community/models';
import type { AppReport } from '@/domain/report/models';
import type { Position } from '@/platform/device/geolocation';
import { useSubmitReport } from './useSubmitReport';

export type ReportFormMode = 'create' | 'edit';

export interface UseReportFormOptions {
  mode: ReportFormMode;
  report?: AppReport | null;
  position: Position | null;
  isOpen?: boolean;
}

export interface UseReportFormReturn {
  themes: CommunityThemeConfig[];
  currentAttributes: CommunityThemeAttribute[];
  selectedTheme: string;
  comment: string;
  attributeValues: Record<string, string>;
  errors: Record<string, string | undefined>;
  isDirty: boolean;
  isSaving: boolean;
  submitError: Error | null;
  setSelectedTheme: (theme: string) => void;
  setComment: (comment: string) => void;
  setAttributeValue: (name: string, value: string) => void;
  validate: () => boolean;
  saveDraft: () => Promise<void>;
  submit: () => Promise<boolean>;
}

/**
 * Extract theme configurations from user's community memberships.
 */
function extractThemeConfigs(
  communitiesMembers: { community_id: number; profile?: any }[] | undefined,
  activeCommunityId: number | undefined
): CommunityThemeConfig[] {
  if (!communitiesMembers || communitiesMembers.length === 0) return [];

  const relevantMembers = activeCommunityId
    ? communitiesMembers.filter(cm => cm.community_id === activeCommunityId)
    : communitiesMembers;

  const configs: CommunityThemeConfig[] = [];
  const seen = new Set<string>();

  for (const cm of relevantMembers) {
    const profile = cm.profile;
    if (!profile) continue;
    const profiles = Array.isArray(profile) ? profile : [profile];
    for (const p of profiles) {
      if (!p.themes) continue;
      for (const t of p.themes as any[]) {
        if (!t.theme) continue;
        const key = `${cm.community_id}:${t.theme}`;
        if (seen.has(key)) continue;
        seen.add(key);
        configs.push({
          theme: t.theme as string,
          attributes: (t.attributes ?? []) as CommunityThemeAttribute[],
          autofilled_attributes: (t.autofilled_attributes ?? []) as CommunityThemeAttribute[],
        });
      }
    }
  }

  return configs;
}

/**
 * Build default attribute values from a theme's attribute definitions.
 */
function buildDefaultValues(attributes: CommunityThemeAttribute[]): Record<string, string> {
  const values: Record<string, string> = {};
  for (const attr of attributes) {
    values[attr.name] = attr.default ?? '';
  }
  return values;
}

const reportStorage = new ReportStorageAdapter();

export function useReportForm({ mode, report, position, isOpen }: UseReportFormOptions): UseReportFormReturn {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { activeCommunity } = useCommunity();

  const themes = useMemo(
    () => extractThemeConfigs(user?.communities_member, activeCommunity?.id),
    [user?.communities_member, activeCommunity?.id]
  );

  const [selectedTheme, setSelectedThemeRaw] = useState<string>('');
  const [attributeValues, setAttributeValues] = useState<Record<string, string>>({});
  const [comment, setComment] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Reset form state when the report prop changes (e.g. opening a different draft)
  const [prevReport, setPrevReport] = useState(report);
  if (report !== prevReport) {
    setPrevReport(report);
    if (mode === 'edit' && report) {
      setSelectedThemeRaw(report.attributes?.themeName ? String(report.attributes.themeName) : '');
      const attrs = report.attributes
        ? Object.fromEntries(
            Object.entries(report.attributes)
              .filter(([k]) => k !== 'themeName')
              .map(([k, v]) => [k, String(v ?? '')])
          )
        : {};
      setAttributeValues(attrs);
      setComment(report.comment ?? '');
    } else {
      setSelectedThemeRaw('');
      setAttributeValues({});
      setComment('');
    }
    setErrors({});
    setIsDirty(false);
  }

  // Initialize form when page opens (component stays mounted between sessions)
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen && !wasOpen) {
    setWasOpen(true);
    if (mode === 'edit' && report) {
      setSelectedThemeRaw(report.attributes?.themeName ? String(report.attributes.themeName) : '');
      const attrs = report.attributes
        ? Object.fromEntries(
            Object.entries(report.attributes)
              .filter(([k]) => k !== 'themeName')
              .map(([k, v]) => [k, String(v ?? '')])
          )
        : {};
      setAttributeValues(attrs);
      setComment(report.comment ?? '');
    } else {
      setSelectedThemeRaw('');
      setAttributeValues({});
      setComment('');
    }
    setErrors({});
    setIsDirty(false);
  }
  if (!isOpen && wasOpen) {
    setWasOpen(false);
  }

  const currentThemeConfig = useMemo(
    () => themes.find(t => t.theme === selectedTheme),
    [themes, selectedTheme]
  );

  const currentAttributes = useMemo(
    () => currentThemeConfig?.attributes ?? [],
    [currentThemeConfig]
  );

  const setSelectedTheme = useCallback((theme: string) => {
    setSelectedThemeRaw(theme);
    setIsDirty(true);
    // Reset attribute values to defaults for the new theme
    const config = themes.find(t => t.theme === theme);
    if (config) {
      setAttributeValues(buildDefaultValues(config.attributes));
    } else {
      setAttributeValues({});
    }
    // Clear theme error
    setErrors(prev => ({ ...prev, theme: undefined }));
  }, [themes]);

  const setAttributeValue = useCallback((name: string, value: string) => {
    setAttributeValues(prev => ({ ...prev, [name]: value }));
    setIsDirty(true);
    // Clear field error
    setErrors(prev => ({ ...prev, [name]: undefined }));
  }, []);

  const handleSetComment = useCallback((value: string) => {
    setComment(value);
    setIsDirty(true);
  }, []);

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string | undefined> = {};
    let valid = true;

    // Theme is required
    if (!selectedTheme) {
      newErrors.theme = t('reports.createOrEdit.form.validation.themeRequired');
      valid = false;
    }

    // Validate mandatory attributes
    for (const attr of currentAttributes) {
      if (!attr.mandatory) continue;
      const value = attributeValues[attr.name] ?? '';
      if (!value.trim()) {
        newErrors[attr.name] = t('reports.createOrEdit.form.validation.fieldRequired');
        valid = false;
        continue;
      }

      if (attr.type === 'integer' && !/^-?\d+$/.test(value)) {
        newErrors[attr.name] = t('reports.createOrEdit.form.validation.invalidInteger');
        valid = false;
      }
      if (attr.type === 'double' && !/^-?\d+(\.\d+)?$/.test(value)) {
        newErrors[attr.name] = t('reports.createOrEdit.form.validation.invalidDecimal');
        valid = false;
      }
    }

    setErrors(newErrors);
    return valid;
  }, [selectedTheme, currentAttributes, attributeValues, t]);

  const buildReport = useCallback((status: ReportStatus): Report => {
    const lon = position?.coords.longitude ?? 0;
    const lat = position?.coords.latitude ?? 0;

    return {
      id: report?.id ?? Date.now(),
      communityId: activeCommunity?.id ?? 0,
      themeId: report?.themeId ?? 0,
      geometry: `POINT(${lon} ${lat})`,
      comment,
      attributes: { ...attributeValues, themeName: selectedTheme },
      status,
      createdAt: report?.createdAt ?? new Date(),
      modifiedAt: new Date(),
      photos: report?.photos ?? [],
    };
  }, [position, report, activeCommunity, comment, attributeValues, selectedTheme]);

  const { submitReport: apiSubmit, isSubmitting, error: submitError, clearError } = useSubmitReport();

  // Use refs to guarantee data stability
  const buildReportRef = useRef(buildReport);
  buildReportRef.current = buildReport;
  const validateRef = useRef(validate);
  validateRef.current = validate;

  const saveDraft = useCallback(async () => {
    setIsSaving(true);
    try {
      const draft = buildReportRef.current(ReportStatus.Draft);
      await reportStorage.saveReport(draft);
      setIsDirty(false);
    } finally {
      setIsSaving(false);
    }
  }, []);

  const submitForm = useCallback(async (): Promise<boolean> => {
    if (!validateRef.current()) return false;
    clearError();
    setIsSaving(true);
    try {
      const submitted = buildReportRef.current(ReportStatus.Submit);
      // Save locally as fallback in case the API call fails
      await reportStorage.saveReport(submitted);

      const result = await apiSubmit(submitted);
      if (result) {
        // API succeeded — draft was already deleted by useSubmitReport
        setIsDirty(false);
        return true;
      }
      // API failed — draft is preserved in local storage
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [apiSubmit, clearError]);

  return {
    themes,
    currentAttributes,
    selectedTheme,
    comment,
    attributeValues,
    errors,
    isDirty,
    isSaving: isSaving || isSubmitting,
    submitError,
    setSelectedTheme,
    setComment: handleSetComment,
    setAttributeValue,
    validate,
    saveDraft,
    submit: submitForm,
  };
}
