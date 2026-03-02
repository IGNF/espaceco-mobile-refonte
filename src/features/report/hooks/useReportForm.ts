import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ReportStatus, type Report, type ReportPhoto } from '@ign/mobile-core';
import type Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useCommunity } from '@/features/community/hooks/useCommunity';
import { ReportStorageAdapter } from '@/infra/storage';
import type { CommunityThemeConfig, CommunityThemeAttribute } from '@/domain/community/models';
import type { AppReport } from '@/domain/report/models';
import type { Position } from '@/platform/device/geolocation';
import { MAX_REPORT_PHOTOS } from '@/shared/constants/report';
import {
  buildReportObjectKey,
  getReportFeatureKind,
  getReportObjectKey,
  getReportObjectLayerName,
  setReportFeatureKind,
} from '@/features/report/utils/reportObjects';
import { getReportSyncState, setReportSyncState } from '@/features/report/utils/reportSyncState';
import { useSubmitReport } from './useSubmitReport';

export type ReportFormMode = 'create' | 'edit';
export type ReportCreationType = 'standard' | 'trace';

export interface UseReportFormOptions {
  mode: ReportFormMode;
  report?: AppReport | null;
  position: Position | null;
  isOpen?: boolean;
  reportType?: ReportCreationType;
}

export interface UseReportFormReturn {
  reportType: ReportCreationType;
  themes: CommunityThemeConfig[];
  currentAttributes: CommunityThemeAttribute[];
  selectedTheme: string;
  comment: string;
  photos: ReportPhoto[];
  objects: Feature<Geometry>[];
  sketches: Feature<Geometry>[];
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
  addObject: (feature: Feature<Geometry>) => void;
  removeObject: (index: number) => void;
  addSketches: (features: Feature<Geometry>[]) => void;
  replaceSketches: (features: Feature<Geometry>[]) => void;
  removeSketch: (index: number) => void;
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

interface SplitReportFeaturesResult {
  objects: Feature<Geometry>[];
  sketches: Feature<Geometry>[];
}

function isFeatureLike(value: unknown): value is Feature<Geometry> {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as {
    get?: unknown;
    getGeometry?: unknown;
    clone?: unknown;
  };

  return typeof candidate.get === 'function' &&
    typeof candidate.getGeometry === 'function' &&
    typeof candidate.clone === 'function';
}

function splitReportFeatures(features?: Feature<Geometry>[]): SplitReportFeaturesResult {
  if (!features || features.length === 0) {
    return { objects: [], sketches: [] };
  }

  const objects: Feature<Geometry>[] = [];
  const sketches: Feature<Geometry>[] = [];

  for (const feature of features) {
    if (!isFeatureLike(feature)) continue;

    const featureKind = getReportFeatureKind(feature);
    if (featureKind === 'object') {
      objects.push(feature);
      continue;
    }
    if (featureKind === 'sketch') {
      sketches.push(feature);
      continue;
    }

    if (getReportObjectKey(feature)) {
      setReportFeatureKind(feature, 'object');
      objects.push(feature);
      continue;
    }

    // Legacy fallback:
    // - selected map objects usually have a stable feature id or layer metadata
    // - user sketches typically have neither
    const hasLegacyObjectHints = feature.getId() !== undefined && feature.getId() !== null ||
      Boolean(getReportObjectLayerName(feature));

    if (hasLegacyObjectHints) {
      setReportFeatureKind(feature, 'object');
      objects.push(feature);
      continue;
    }

    setReportFeatureKind(feature, 'sketch');
    sketches.push(feature);
  }

  return { objects, sketches };
}

const reportStorage = new ReportStorageAdapter();

export function useReportForm({
  mode,
  report,
  position,
  isOpen,
  reportType,
}: UseReportFormOptions): UseReportFormReturn {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { activeCommunity } = useCommunity();

  const themes = useMemo(
    () => extractThemeConfigs(user?.communities_member, activeCommunity?.id),
    [user?.communities_member, activeCommunity?.id]
  );
  const resolvedReportType: ReportCreationType = reportType ?? 'standard';

  const [selectedTheme, setSelectedThemeRaw] = useState<string>('');
  const [attributeValues, setAttributeValues] = useState<Record<string, string>>({});
  const [comment, setComment] = useState<string>('');
  const [photos, setPhotos] = useState<ReportPhoto[]>(report?.photos ?? []);
  const [objects, setObjects] = useState<Feature<Geometry>[]>(() => {
    return splitReportFeatures(report?.features).objects;
  });
  const [sketches, setSketches] = useState<Feature<Geometry>[]>(() => {
    return splitReportFeatures(report?.features).sketches;
  });
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
      const { objects: nextObjects, sketches: nextSketches } = splitReportFeatures(nextReport.features);
      setObjects(nextObjects);
      setSketches(nextSketches);
    } else {
      setReportId(Date.now());
      setSelectedThemeRaw('');
      setAttributeValues({});
      setComment('');
      setPhotos([]);
      setObjects([]);
      setSketches([]);
    }
    setErrors({});
    setIsDirty(false);
  }, [mode]);

  // Reset form state when the report prop changes (e.g. opening a different draft)
  const previousReportRef = useRef(report);
  useEffect(() => {
    if (report === previousReportRef.current) return;
    previousReportRef.current = report;
    resetFormState(report);
  }, [report, resetFormState]);

  // Initialize form when page opens (component stays mounted between sessions)
  const wasOpenRef = useRef(Boolean(isOpen));
  useEffect(() => {
    const wasOpen = wasOpenRef.current;

    if (isOpen && !wasOpen) {
      resetFormState(report);
    }

    wasOpenRef.current = Boolean(isOpen);
  }, [isOpen, report, resetFormState]);

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

  const getObjectUniqueKey = useCallback((feature: Feature<Geometry>): string => {
    const layerName = getReportObjectLayerName(feature) ?? 'layer';
    return buildReportObjectKey(feature, layerName);
  }, []);

  const addObject = useCallback((feature: Feature<Geometry>) => {
    const featureForForm = feature.clone();
    const featureId = feature.getId();
    if (featureId !== undefined) {
      featureForForm.setId(featureId);
    }
    setReportFeatureKind(featureForForm, 'object');

    const nextObjectKey = getObjectUniqueKey(featureForForm);
    let hasAdded = false;

    setObjects(prev => {
      const duplicate = prev.some((existingFeature) => {
        return getObjectUniqueKey(existingFeature) === nextObjectKey;
      });

      if (duplicate) return prev;

      hasAdded = true;
      return [...prev, featureForForm];
    });

    if (hasAdded) {
      setIsDirty(true);
    }
  }, [getObjectUniqueKey]);

  const removeObject = useCallback((index: number) => {
    let hasRemoved = false;

    setObjects(prev => {
      if (index < 0 || index >= prev.length) return prev;
      hasRemoved = true;
      return prev.filter((_, itemIndex) => itemIndex !== index);
    });

    if (hasRemoved) {
      setIsDirty(true);
    }
  }, []);

  const addSketches = useCallback((features: Feature<Geometry>[]) => {
    const nextFeatures = features.filter(isFeatureLike);
    if (nextFeatures.length === 0) return;

    for (const feature of nextFeatures) {
      setReportFeatureKind(feature, 'sketch');
    }

    setSketches(prev => [
      ...prev,
      ...nextFeatures,
    ]);
    setErrors(prev => ({ ...prev, trace: undefined }));
    setIsDirty(true);
  }, []);

  const replaceSketches = useCallback((features: Feature<Geometry>[]) => {
    const nextFeatures = features.filter(isFeatureLike);

    for (const feature of nextFeatures) {
      setReportFeatureKind(feature, 'sketch');
    }

    setSketches(nextFeatures);
    setErrors(prev => ({ ...prev, trace: undefined }));
    setIsDirty(true);
  }, []);

  const removeSketch = useCallback((index: number) => {
    let hasRemoved = false;

    setSketches(prev => {
      if (index < 0 || index >= prev.length) return prev;
      hasRemoved = true;
      return prev.filter((_, itemIndex) => itemIndex !== index);
    });

    if (hasRemoved) {
      setIsDirty(true);
    }
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

    if (resolvedReportType === 'trace' && sketches.length === 0) {
      newErrors.trace = t('reports.createOrEdit.form.validation.traceRequired');
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  }, [selectedTheme, currentAttributes, attributeValues, resolvedReportType, sketches.length, t]);

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
      features: [...objects, ...sketches],
    };
  }, [
    position,
    reportId,
    activeCommunity,
    report?.themeId,
    report?.createdAt,
    comment,
    attributeValues,
    selectedTheme,
    photos,
    objects,
    sketches,
  ]);

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
      const storedReport = await reportStorage.getReport(submitted.id);
      const storedSyncState = storedReport ? getReportSyncState(storedReport) : {};
      const reportToSubmit = (storedSyncState.serverId || storedSyncState.photosToSend)
        ? setReportSyncState(submitted, storedSyncState)
        : submitted;

      // Save locally as fallback in case the API call fails
      await reportStorage.saveReport(reportToSubmit);

      const result = await apiSubmit(reportToSubmit);
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
    reportType: resolvedReportType,
    themes,
    currentAttributes,
    selectedTheme,
    comment,
    photos,
    objects,
    sketches,
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
    addObject,
    removeObject,
    addSketches,
    replaceSketches,
    removeSketch,
    validate,
    saveDraft,
    submit: submitForm,
  };
}
