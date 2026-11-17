import { useMemo } from 'react';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { useCommunity } from '@/features/community/hooks/useCommunity';
import {
  extractAvailableReportThemes,
  extractFastReportThemes,
  extractNonFastReportThemes,
} from '@/features/report/utils/reportAttributes';

function useAvailableReportThemes() {
  const { user } = useAuth();
  const { activeCommunity } = useCommunity();

  return useMemo(() => extractAvailableReportThemes(
    user?.communities_member,
    activeCommunity?.id,
    user?.shared_themes
  ), [activeCommunity?.id, user?.communities_member, user?.shared_themes]);
}

export function useFastReportThemes() {
  const themes = useAvailableReportThemes();

  return useMemo(() => extractFastReportThemes(themes), [themes]);
}

/** Themes of the active group that are not fast report themes (revealed by « Autres » in the theme picker). */
export function useNonFastReportThemes() {
  const themes = useAvailableReportThemes();

  return useMemo(() => extractNonFastReportThemes(themes), [themes]);
}
