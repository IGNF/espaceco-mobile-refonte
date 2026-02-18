import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ReportStatus, type Report, type ReportPhoto } from '@ign/mobile-core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useCommunity } from '@/features/community/hooks/useCommunity';
import { ReportStorageAdapter } from '@/infra/storage';
import type { CommunityThemeConfig, CommunityThemeAttribute } from '@/domain/community/models';
import type { AppReport } from '@/domain/report/models';
import type { Position } from '@/platform/device/geolocation';
import { MAX_REPORT_PHOTOS } from '@/shared/constants/report';
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
  photos: ReportPhoto[];
  photoLimit: number;
  attributeValues: Record<string, string>;
  errors: Record<string, string | undefined>;
  isDirty: boolean;
  isSaving: boolean;
  isAddingPhoto: boolean;
  submitError: Error | null;
  setSelectedTheme: (theme: string) => void;
  setComment: (comment: string) => void;
  setAttributeValue: (name: string, value: string) => void;
  addPhoto: () => Promise<void>;
  removePhoto: (index: number) => void;
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

function mapReportAttributesToFormValues(attributes?: Record<string, any>): Record<string, string> {
  if (!attributes) return {};
  return Object.fromEntries(
    Object.entries(attributes)
      .filter(([key]) => key !== 'themeName')
      .map(([key, value]) => [key, String(value ?? '')])
  );
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
  const [photos, setPhotos] = useState<ReportPhoto[]>(report?.photos ?? []);
  const [reportId, setReportId] = useState<number>(report?.id ?? Date.now());
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingPhoto, setIsAddingPhoto] = useState(false);

  const resetFormState = useCallback((nextReport?: AppReport | null) => {
    if (mode === 'edit' && nextReport) {
      setReportId(nextReport.id);
      setSelectedThemeRaw(nextReport.attributes?.themeName ? String(nextReport.attributes.themeName) : '');
      setAttributeValues(mapReportAttributesToFormValues(nextReport.attributes));
      setComment(nextReport.comment ?? '');
      setPhotos(nextReport.photos ?? []);
    } else {
      setReportId(Date.now());
      setSelectedThemeRaw('');
      setAttributeValues({});
      setComment('');
      setPhotos([]);
    }
    setErrors({});
    setIsDirty(false);
  }, [mode]);

  // Reset form state when the report prop changes (e.g. opening a different draft)
  const [prevReport, setPrevReport] = useState(report);
  useEffect(() => {
    if (report === prevReport) return;
    setPrevReport(report);
    resetFormState(report);
  }, [report, prevReport, resetFormState]);

  // Initialize form when page opens (component stays mounted between sessions)
  const [wasOpen, setWasOpen] = useState(isOpen);
  useEffect(() => {
    if (isOpen && !wasOpen) {
      setWasOpen(true);
      resetFormState(report);
      return;
    }
    if (!isOpen && wasOpen) {
      setWasOpen(false);
    }
  }, [isOpen, wasOpen, report, resetFormState]);

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

  const addPhoto = useCallback(async () => {
    if (isAddingPhoto) return;
    if (photos.length >= MAX_REPORT_PHOTOS) return;

    setIsAddingPhoto(true);
    try {
      const isWebPlatform = Capacitor.getPlatform() === 'web';
      const capturedPhoto = await Camera.getPhoto({
        source: isWebPlatform ? CameraSource.Photos : CameraSource.Prompt,
        resultType: CameraResultType.DataUrl,
        quality: 85,
        webUseInput: true,
      });

      if (!capturedPhoto.dataUrl) return;
      const blob = await fetch(capturedPhoto.dataUrl).then(response => response.blob());
      const photoPath = await reportStorage.savePhotoBlob(reportId, Date.now(), blob);

      setPhotos(prev => [
        ...prev,
        {
          localPath: photoPath,
          thumbnail: capturedPhoto.dataUrl ?? undefined,
          uploaded: false,
        },
      ]);
      setIsDirty(true);
    } catch (error) {
      // Ignore user-cancelled camera/gallery actions.
      if (error instanceof Error && /cancel/i.test(error.message)) {
        return;
      }
      console.error('Failed to add report photo', error);
    } finally {
      setIsAddingPhoto(false);
    }
  }, [isAddingPhoto, photos.length, reportId]);

  const removePhoto = useCallback((index: number) => {
    setPhotos(prev => prev.filter((_, itemIndex) => itemIndex !== index));
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
      id: reportId,
      communityId: activeCommunity?.id ?? 0,
      themeId: report?.themeId ?? 0,
      geometry: `POINT(${lon} ${lat})`,
      comment,
      attributes: { ...attributeValues, themeName: selectedTheme },
      status,
      createdAt: report?.createdAt ?? new Date(),
      modifiedAt: new Date(),
      photos,
    };
  }, [position, reportId, activeCommunity, report?.themeId, report?.createdAt, comment, attributeValues, selectedTheme, photos]);

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
    photos,
    photoLimit: MAX_REPORT_PHOTOS,
    attributeValues,
    errors,
    isDirty,
    isSaving: isSaving || isSubmitting,
    isAddingPhoto,
    submitError,
    setSelectedTheme,
    setComment: handleSetComment,
    setAttributeValue,
    addPhoto,
    removePhoto,
    validate,
    saveDraft,
    submit: submitForm,
  };
}
