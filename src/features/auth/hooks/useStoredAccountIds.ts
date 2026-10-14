import { useEffect, useState } from 'react';

import { UserStorageAdapter } from '@/infra/storage';

const userStorage = new UserStorageAdapter();

export function useStoredAccountIds() {
  const [userId, setUserId] = useState<number | null>(null);
  const [communityId, setCommunityId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      try {
        const [storedUserId, storedCommunityId] = await Promise.all([
          userStorage.getUserId(),
          userStorage.getCommunityId(),
        ]);
        if (!isMounted) return;
        setUserId(storedUserId);
        setCommunityId(storedCommunityId);
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

  return { userId, communityId, isLoading };
}
