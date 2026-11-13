import type { Report } from '@ign/mobile-core';

import type { CommunityThemeConfig } from '@/domain/community/models';
import { buildDefaultReportAttributeValues } from '@/features/report/utils/reportAttributes';

export function getReportTemplateTheme(report: Report): CommunityThemeConfig {
  // Template-mode fast reports keep attributes on the report itself.
  // The toolbar only needs theme metadata for display and common trace settings.
  return {
    theme: String(report.attributes?.themeName ?? ''),
    communityId: report.communityId,
    attributes: [],
    autofilled_attributes: [],
  };
}

function isReportTemplateTheme(report: Report, theme: CommunityThemeConfig): boolean {
  return String(report.attributes?.themeName ?? '') === theme.theme
    && (theme.communityId ?? report.communityId) === report.communityId;
}

/**
 * Switches a GNSS report template to another theme while recording.
 * The previous theme's attributes do not apply to the new one, so they are reset to the new
 * theme defaults, as the report form does. Comment, photos and objects are kept.
 */
export function applyThemeToReportTemplate(report: Report, theme: CommunityThemeConfig): Report {
  if (isReportTemplateTheme(report, theme)) return report;

  return {
    ...report,
    communityId: theme.communityId ?? report.communityId,
    attributes: {
      ...buildDefaultReportAttributeValues(theme.attributes),
      themeName: theme.theme,
    },
  };
}
