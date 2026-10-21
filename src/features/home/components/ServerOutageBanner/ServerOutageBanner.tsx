import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getServerOutageMessage, subscribeServerOutage } from '@/shared/errors/serverOutageSignal';
import { joinCSSClassNames } from '@/shared/utils/join';

import styles from './ServerOutageBanner.module.css';

export function ServerOutageBanner() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<number | null>(null);
  const [remoteMessage, setRemoteMessage] = useState<{ status: number; text: string } | null>(null);

  useEffect(() => subscribeServerOutage(setStatus), []);

  useEffect(() => {
    if (status === null) return;

    let cancelled = false;
    void getServerOutageMessage().then((message) => {
      if (cancelled) return;
      const trimmed = message?.trim();
      setRemoteMessage(trimmed ? { status, text: trimmed } : null);
    });

    return () => {
      cancelled = true;
    };
  }, [status]);

  if (status === null) return null;

  const notice = remoteMessage?.status === status ? remoteMessage.text : null;
  const message = notice ?? t('home.serverOutage', { code: status });

  return (
    <div className={joinCSSClassNames(styles.banner, notice && styles.bannerNotice)} role="status">
      <div className={styles.track}>
        <span>{message}</span>
        <span aria-hidden="true">{message}</span>
      </div>
    </div>
  );
}
