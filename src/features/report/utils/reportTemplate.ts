import type { Report } from '@ign/mobile-core';

import type { CommunityThemeConfig } from '@/domain/community/models';

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
