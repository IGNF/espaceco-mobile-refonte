import { Trans, useTranslation } from 'react-i18next';

import { EXTERNAL_LINKS } from '@/shared/constants/externalLinks';
import { Divider } from '@/shared/ui/Divider/Divider';
import { ExternalLink } from '@/shared/ui/ExternalLink';
import { PageHeader } from '@/shared/ui/PageHeader';
import { SlideUpPage } from '@/shared/ui/SlideUpPage';

import screen from '@/shared/styles/screen.module.css';
import typography from '@/shared/styles/typography.module.css';
import styles from './HelpPage.module.css';

export interface HelpPageProps {
  isOpen: boolean;
  onClose: () => void;
}

interface HelpFaqItem {
  question: string;
  answer: string;
}

const HELP_FAQ_SECTIONS = ['report', 'guichet', 'extraFaq'] as const;

export function HelpPage({ isOpen, onClose }: HelpPageProps) {
  const { i18n, t } = useTranslation();
  const transComponents = {
    br: <br />,
    myAccountLink: <ExternalLink href={EXTERNAL_LINKS.MY_ACCOUNT}>{''}</ExternalLink>,
    createAccountLink: <ExternalLink href={EXTERNAL_LINKS.CREATE_ACCOUNT}>{''}</ExternalLink>,
  };
  const faqSections = HELP_FAQ_SECTIONS.map((sectionKey) => ({
    key: sectionKey,
    title: i18n.exists(`helpPage.${sectionKey}.title`) ? t(`helpPage.${sectionKey}.title`) : '',
    faq: t(`helpPage.${sectionKey}.faq`, { returnObjects: true }) as HelpFaqItem[],
  }));

  return (
    <SlideUpPage isOpen={isOpen} onClose={onClose}>
      <PageHeader title={t('helpPage.title')} onClose={onClose} />
      <main className={screen.screenContainer}>
        <h1 className={typography.title}>{t('helpPage.title')}</h1>

        <section className={styles.faqSection}>
          {faqSections.map((section, sectionIndex) => (
            <div key={section.key}>
              {sectionIndex > 0 && <Divider className={styles.divider} />}
              {section.title && (
                <p className={typography.subtitle + ' ' + styles.sectionTitle}>
                  {section.title}
                </p>
              )}
              {section.faq.map((faqItem, faqIndex) => (
                <article key={faqItem.question} className={styles.faqItem}>
                  <p className={typography.paragraph + ' ' + styles.question}>
                    <strong>{faqItem.question}</strong>
                  </p>
                  <p className={typography.paragraph}>
                    <Trans
                      i18nKey={`helpPage.${section.key}.faq.${faqIndex}.answer`}
                      components={transComponents}
                    />
                  </p>
                </article>
              ))}
            </div>
          ))}
        </section>
      </main>
    </SlideUpPage>
  );
}
