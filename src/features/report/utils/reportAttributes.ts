import type {
  CommunityThemeAttribute,
  CommunityThemeConfig,
} from '@/domain/community/models';
import type { AppReport } from '@/domain/report/models';
import type { SharedThemeCommunity } from '@/domain/user/models';
import { formatDate, formatDateTime } from '@/shared/utils/date';

const FAST_REPORT_THEME_PATTERN = /^(GPS|Rapide)@/;

export interface ReportCommunityMemberProfileSource {
  community_id: number;
  profile?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeAttributeLabel(name: string): string {
  const formattedName = name
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim();

  if (!formattedName) {
    return name;
  }

  return formattedName.charAt(0).toUpperCase() + formattedName.slice(1);
}

function formatCheckboxValue(value: string): string {
  const normalizedValue = value.trim().toLowerCase();

  if (['1', 'true', 'yes', 'oui'].includes(normalizedValue)) {
    return 'Oui';
  }

  if (['0', 'false', 'no', 'non'].includes(normalizedValue)) {
    return 'Non';
  }

  return value;
}

function formatAttributeValue(
  value: unknown,
  attributeType?: CommunityThemeAttribute['type']
): string | null {
  if (value == null) {
    return null;
  }

  if (Array.isArray(value)) {
    const items = value
      .map((item) => formatAttributeValue(item))
      .filter((item): item is string => Boolean(item));

    return items.length > 0 ? items.join(', ') : null;
  }

  if (value instanceof Date) {
    return formatDateTime(value);
  }

  if (isRecord(value)) {
    if (typeof value.title === 'string' && value.title.trim().length > 0) {
      return value.title;
    }

    if (typeof value.name === 'string' && value.name.trim().length > 0) {
      return value.name;
    }

    const nestedEntries = Object.entries(value)
      .map(([key, nestedValue]) => {
        const formattedNestedValue = formatAttributeValue(nestedValue);
        if (!formattedNestedValue) {
          return null;
        }

        return `${normalizeAttributeLabel(key)}: ${formattedNestedValue}`;
      })
      .filter((entry): entry is string => Boolean(entry));

    return nestedEntries.length > 0 ? nestedEntries.join(', ') : null;
  }

  const rawValue = String(value).trim();
  if (!rawValue) {
    return null;
  }

  if (attributeType === 'checkbox') {
    return formatCheckboxValue(rawValue);
  }

  if (attributeType === 'date') {
    const parsedDate = new Date(rawValue);
    return Number.isNaN(parsedDate.getTime()) ? rawValue : formatDate(parsedDate);
  }

  return rawValue;
}

function extractReportAttributeEntries(report: AppReport): [string, unknown][] {
  if (!isRecord(report.attributes)) {
    return [];
  }

  const attributesRecord = report.attributes;
  const mergedAttributes = new Map<string, unknown>();

  const rawAttributes = Array.isArray(attributesRecord.raw)
    ? attributesRecord.raw
    : [];

  for (const rawAttribute of rawAttributes) {
    if (!isRecord(rawAttribute) || !isRecord(rawAttribute.attributes)) {
      continue;
    }

    for (const [key, value] of Object.entries(rawAttribute.attributes)) {
      mergedAttributes.set(key, value);
    }
  }

  if (isRecord(attributesRecord.attributes)) {
    for (const [key, value] of Object.entries(attributesRecord.attributes)) {
      mergedAttributes.set(key, value);
    }
  }

  for (const [key, value] of Object.entries(attributesRecord)) {
    if (key === 'themeName' || key === 'raw' || key === 'attributes') {
      continue;
    }

    mergedAttributes.set(key, value);
  }

  return Array.from(mergedAttributes.entries());
}

function getReportCommunityId(report: AppReport): number | undefined {
  if (!isRecord(report.attributes) || !Array.isArray(report.attributes.raw)) {
    return typeof report.communityId === 'number' ? report.communityId : undefined;
  }

  const firstRawAttribute = report.attributes.raw[0];
  if (isRecord(firstRawAttribute) && typeof firstRawAttribute.community === 'number') {
    return firstRawAttribute.community;
  }

  return typeof report.communityId === 'number' ? report.communityId : undefined;
}

function getReportThemeName(report: AppReport): string | undefined {
  if (!isRecord(report.attributes) || typeof report.attributes.themeName !== 'string') {
    return undefined;
  }

  return report.attributes.themeName;
}

export function extractThemeConfigs(
  communitiesMembers: ReportCommunityMemberProfileSource[] | undefined,
  activeCommunityId: number | undefined
): CommunityThemeConfig[] {
  if (!communitiesMembers || communitiesMembers.length === 0) return [];

  const relevantMembers = activeCommunityId
    ? communitiesMembers.filter((communityMember) => communityMember.community_id === activeCommunityId)
    : communitiesMembers;

  const configs: CommunityThemeConfig[] = [];
  const seen = new Set<string>();

  for (const communityMember of relevantMembers) {
    const profiles = Array.isArray(communityMember.profile)
      ? communityMember.profile
      : [communityMember.profile];

    for (const profile of profiles) {
      if (!isRecord(profile) || !Array.isArray(profile.themes)) {
        continue;
      }

      for (const rawTheme of profile.themes) {
        if (!isRecord(rawTheme) || typeof rawTheme.theme !== 'string' || rawTheme.theme.length === 0) {
          continue;
        }

        const key = `${communityMember.community_id}:${rawTheme.theme}`;
        if (seen.has(key)) {
          continue;
        }

        seen.add(key);
        configs.push({
          communityId: communityMember.community_id,
          theme: rawTheme.theme,
          attributes: Array.isArray(rawTheme.attributes)
            ? rawTheme.attributes as CommunityThemeAttribute[]
            : [],
          autofilled_attributes: Array.isArray(rawTheme.autofilled_attributes)
            ? rawTheme.autofilled_attributes as CommunityThemeAttribute[]
            : [],
        });
      }
    }
  }

  return configs;
}

export function extractSharedThemeConfigs(sharedThemes: SharedThemeCommunity[] | undefined): CommunityThemeConfig[] {
  if (!sharedThemes || sharedThemes.length === 0) return [];

  const configs: CommunityThemeConfig[] = [];
  const seen = new Set<string>();

  for (const sharedCommunity of sharedThemes) {

    for (const rawTheme of sharedCommunity.themes ?? []) {

      const key = `${sharedCommunity.community_id}:${rawTheme.theme}`;
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      configs.push({
        communityId: sharedCommunity.community_id,
        communityName: sharedCommunity.community_name ?? undefined,
        theme: rawTheme.theme,
        global: rawTheme.global ?? undefined,
        help: rawTheme.help ?? undefined,
        attributes: rawTheme.attributes ?? [],
        autofilled_attributes: rawTheme.autofilled_attributes ?? [],
      });
    }
  }
  return configs;
}

export function extractAvailableReportThemes(
  communitiesMembers: ReportCommunityMemberProfileSource[] | undefined,
  activeCommunityId: number | undefined,
  sharedThemes: SharedThemeCommunity[] | undefined
): CommunityThemeConfig[] {
  if (activeCommunityId) {
    return extractThemeConfigs(communitiesMembers, activeCommunityId);
  }

  return extractSharedThemeConfigs(sharedThemes);
}

export function extractFastReportThemes(themes: CommunityThemeConfig[]): CommunityThemeConfig[] {
  return themes.filter((theme) => FAST_REPORT_THEME_PATTERN.test(theme.theme));
}

export function buildDefaultReportAttributeValues(
  attributes: CommunityThemeAttribute[]
): Record<string, string> {
  const values: Record<string, string> = {};
  for (const attr of attributes) {
    values[attr.name] = attr.default ?? '';
  }
  return values;
}

function getReportThemeAttributes(
  report: AppReport,
  communitiesMembers: ReportCommunityMemberProfileSource[] | undefined
): CommunityThemeAttribute[] {
  const themeName = getReportThemeName(report);
  if (!themeName) {
    return [];
  }

  const themeConfigs = extractThemeConfigs(communitiesMembers, getReportCommunityId(report));
  return themeConfigs.find((themeConfig) => themeConfig.theme === themeName)?.attributes ?? [];
}

export function formatReportAttributes(
  report: AppReport,
  communitiesMembers?: ReportCommunityMemberProfileSource[]
): string | null {
  const attributeEntries = extractReportAttributeEntries(report);
  if (attributeEntries.length === 0) {
    return null;
  }

  const attributeEntryMap = new Map(attributeEntries);
  const themeAttributes = getReportThemeAttributes(report, communitiesMembers);
  const themeAttributeMap = new Map(themeAttributes.map((attribute) => [attribute.name, attribute]));
  const orderedKeys = [
    ...themeAttributes
      .map((attribute) => attribute.name)
      .filter((name) => attributeEntryMap.has(name)),
    ...Array.from(attributeEntryMap.keys())
      .filter((key) => !themeAttributeMap.has(key))
      .sort((left, right) => left.localeCompare(right, 'fr')),
  ];

  const formattedEntries = orderedKeys
    .map((key) => {
      const value = attributeEntryMap.get(key);
      const formattedValue = formatAttributeValue(value, themeAttributeMap.get(key)?.type);
      if (!formattedValue) {
        return null;
      }

      return `${normalizeAttributeLabel(key)}: ${formattedValue}`;
    })
    .filter((entry): entry is string => Boolean(entry));

  return formattedEntries.length > 0 ? formattedEntries.join('; ') : null;
}
