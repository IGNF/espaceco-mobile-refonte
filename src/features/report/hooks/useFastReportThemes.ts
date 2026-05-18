import { useMemo } from 'react';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { useCommunity } from '@/features/community/hooks/useCommunity';
import {
  extractAvailableReportThemes,
  extractFastReportThemes,
} from '@/features/report/utils/reportAttributes';

export function useFastReportThemes() {
  const { user } = useAuth();
  const { activeCommunity } = useCommunity();

  return useMemo(() => {
    const themes = extractAvailableReportThemes(
      user?.communities_member,
      activeCommunity?.id,
      user?.shared_themes
    );

    return extractFastReportThemes(themes);
  }, [activeCommunity?.id, user?.communities_member, user?.shared_themes]);
}
