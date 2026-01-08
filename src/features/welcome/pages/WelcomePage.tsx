import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFirstRun } from '../hooks/useFirstRun';
import { useTranslation } from 'react-i18next';
import { Trans } from 'react-i18next';
import { Button } from '@/shared/ui/Button';

import screen from '@/shared/styles/screen.module.css';
import typography from '@/shared/styles/typography.module.css';
import styles from './WelcomePage.module.css';
import welcomeIllustration from '../assets/welcome-illustration.svg';

export function WelcomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isFirstRun, markAsSeen } = useFirstRun();

  useEffect(() => {
    if (isFirstRun === false) {
      navigate('/login', { replace: true });
    }
  }, [isFirstRun, navigate]);

  if (isFirstRun === null || isFirstRun === false) {
    return null;
  }

  const handleContinue = () => {
    markAsSeen();
    navigate('/login');
  };

  return (
    <div className={styles.container + ' ' + screen.screenContainer}>
      <div className={styles.content}>
        <img src={welcomeIllustration} alt="welcome illustration" className={styles.illustration} />
        <h1 className={typography.title}>{t('welcome.title')}</h1>
        <h2 className={typography.subtitle}>{t('welcome.subtitle')}</h2>

        <p className={typography.paragraph}>
          <Trans i18nKey="welcome.description" components={{ br: <br /> }} />
        </p>

        <Button onClick={handleContinue} fullWidth>
          {t('welcome.cta')}
        </Button>
      </div>
    </div>
  );
}
