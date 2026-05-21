import { Trans, useTranslation } from 'react-i18next';

import { EXTERNAL_LINKS } from '@/shared/constants/externalLinks';
import { Divider } from '@/shared/ui/Divider/Divider';
import { ExternalLink } from '@/shared/ui/ExternalLink';
import { PageHeader } from '@/shared/ui/PageHeader';
import { SlideUpPage } from '@/shared/ui/SlideUpPage';

import screen from '@/shared/styles/screen.module.css';
import typography from '@/shared/styles/typography.module.css';
import styles from './AboutPage.module.css';

export interface AboutPageProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutPage({ isOpen, onClose }: AboutPageProps) {
  const { t } = useTranslation();
  const transComponents = {
    b: <strong />,
    i: <em />,
    br: <br />,
    mainWebsiteLink: <ExternalLink href={EXTERNAL_LINKS.ESPACE_COLLABORATIF}>{''}</ExternalLink>,
    cguLink: <ExternalLink href={EXTERNAL_LINKS.CGU}>{''}</ExternalLink>,
    contactLink: <ExternalLink href={EXTERNAL_LINKS.CONTACT_FORM}>{''}</ExternalLink>,
  };

  return (
    <SlideUpPage isOpen={isOpen} onClose={onClose}>
      <PageHeader title={t('aboutGeneral.title')} onClose={onClose} />
      <main className={screen.screenContainer}>
        <h1 className={typography.title}>{t('aboutGeneral.title')}</h1>
        <p className={typography.paragraph}>
          <Trans i18nKey="aboutGeneral.subtitle" components={transComponents} />
        </p>
        <p className={typography.paragraph}>{t('aboutGeneral.tagline')}</p>

        <section className={styles.section}>
          <p className={typography.paragraph}>
            <Trans i18nKey="aboutGeneral.intro1" components={transComponents} />
          </p>
          <p className={typography.paragraph}>
            <Trans i18nKey="aboutGeneral.intro2" components={transComponents} />
          </p>
        </section>

        <Divider className={styles.divider} />

        <section className={styles.section}>
          <h2 className={typography.heading2}>{t('aboutGeneral.legals.title')}</h2>

          <h3 className={styles.legalTitle}>{t('aboutGeneral.legals.editeur.title')}</h3>
          <p className={typography.paragraph}>
            {t('aboutGeneral.legals.editeur.content')}
          </p>

          <h3 className={styles.legalTitle}>
            {t('aboutGeneral.legals.personalDataProtection.title')}
          </h3>
          <p className={typography.paragraph}>
            <Trans
              i18nKey="aboutGeneral.legals.personalDataProtection.content1"
              components={transComponents}
            />
          </p>
          <p className={typography.paragraph}>
            <Trans
              i18nKey="aboutGeneral.legals.personalDataProtection.content2"
              components={transComponents}
            />
          </p>

          <h3 className={styles.legalTitle}>
            {t('aboutGeneral.legals.intellectualProperty.title')}
          </h3>
          <p className={typography.paragraph}>
            <Trans
              i18nKey="aboutGeneral.legals.intellectualProperty.content"
              components={transComponents}
            />
          </p>

          <h3 className={styles.legalTitle}>{t('aboutGeneral.legals.termsOfUse.title')}</h3>
          <p className={typography.paragraph}>
            <Trans i18nKey="aboutGeneral.legals.termsOfUse.content" components={transComponents} />
          </p>

          <h3 className={styles.legalTitle}>{t('aboutGeneral.legals.contact.title')}</h3>
          <p className={typography.paragraph}>
            <Trans i18nKey="aboutGeneral.legals.contact.content" components={transComponents} />
          </p>
        </section>
      </main>
    </SlideUpPage>
  );
}
