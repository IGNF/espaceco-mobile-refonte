import { useEffect, useState } from 'react';

import type { DisplayMode } from '@/domain/user/models';
import { EspaceCo_SettingsStore } from '@/infra/persistence/settingsStore';
import { UserStorageAdapter } from '@/infra/storage';

const userStorage = new UserStorageAdapter();

export function useStoredAccountIds() {
  const [userId, setUserId] = useState<number | null>(null);
  const [communityId, setCommunityId] = useState<number | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      try {
        const [storedUserId, storedCommunityId] = await Promise.all([
          userStorage.getUserId(),
          userStorage.getCommunityId(),
        ]);
        const storedDisplayMode = storedUserId === null
          ? null
          : await EspaceCo_SettingsStore.getDisplayMode(storedUserId);
        if (!isMounted) return;
        setUserId(storedUserId);
        setCommunityId(storedCommunityId);
        setDisplayMode(storedDisplayMode);
      } catch (error) {
        console.error('Failed to read stored account ids:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  return { userId, communityId, displayMode, isLoading };
}
