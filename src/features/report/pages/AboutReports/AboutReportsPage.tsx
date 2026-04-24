import { PageHeader } from "@/shared/ui/PageHeader";
import { SlideUpPage } from "@/shared/ui/SlideUpPage";
import { Trans, useTranslation } from "react-i18next";

import screen from '@/shared/styles/screen.module.css';
import typography from '@/shared/styles/typography.module.css';
import { useCommunity } from "@/features/community/hooks/useCommunity";

import { ReportStatus } from "@ign/mobile-core";
import { getStatusColor } from "@/shared/utils/reportStatus";

import styles from './AboutReportsPage.module.css';
import { EXTERNAL_LINKS } from "@/shared/constants/externalLinks";
import { ExternalLink } from "@/shared/ui/ExternalLink";
import { Divider } from "@/shared/ui/Divider/Divider";

export interface AboutReportsPageProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutReportsPage({ isOpen, onClose }: AboutReportsPageProps) {
  const { t } = useTranslation();
  const { activeCommunity } = useCommunity();
  const legendMap = [
    {
      status: ReportStatus.Draft,
      title: t('aboutReports.legend.draft'),
      color: getStatusColor(ReportStatus.Draft),
    },
    // {
    //   status: ReportStatus.Submit,
    //   title: t('aboutReports.legend.submit'),
    //   color: getStatusColor(ReportStatus.Submit),
    // },
    {
      status: ReportStatus.Pending,
      title: t('aboutReports.legend.pending'),
      color: getStatusColor(ReportStatus.Pending),
    },
    {
      status: ReportStatus.Pending_Qualification,
      title: t('aboutReports.legend.pendingQualification'),
      color: getStatusColor(ReportStatus.Pending_Qualification),
    },
    {
      status: ReportStatus.Valid,
      title: t('aboutReports.legend.valid'),
      color: getStatusColor(ReportStatus.Valid),
    },
    {
      status: ReportStatus.Valid_Already_Treated,
      title: t('aboutReports.legend.validAlreadyTreated'),
      color: getStatusColor(ReportStatus.Valid_Already_Treated),
    },
    {
      status: ReportStatus.Reject,
      title: t('aboutReports.legend.rejected'),
      color: getStatusColor(ReportStatus.Reject),
    },
    {
      status: ReportStatus.Reject_Irrelevant,
      title: t('aboutReports.legend.rejectedIrrelevant'),
      color: getStatusColor(ReportStatus.Reject_Irrelevant),
    },
  ];

  return (
    <SlideUpPage isOpen={isOpen} onClose={onClose}>
      <PageHeader title={t('aboutReports.title')} subtitle={activeCommunity?.name ?? ''} onClose={onClose} />
      <main className={screen.screenContainer}>
        <h1 className={typography.title}>{t('aboutReports.title')}</h1>
        <div className={styles.reportSection}>
          <p className={typography.paragraph}>
            <Trans i18nKey="aboutReports.reportSection.intro" components={{ b: <strong /> }} />
          </p>
          <p className={typography.paragraph}>
            <Trans i18nKey="aboutReports.reportSection.contributor" components={{ b: <strong /> }} />
          </p>
          <p className={typography.paragraph}>
            {t('aboutReports.reportSection.menuIntro')}
          </p>
          <ul className={styles.menuList}>
            <li className={typography.paragraph}>{t('aboutReports.reportSection.menuItem1')}</li>
            <li className={typography.paragraph}>{t('aboutReports.reportSection.menuItem2')}</li>
            <li className={typography.paragraph}>{t('aboutReports.reportSection.menuItem3')}</li>
          </ul>
          <p className={typography.paragraph}>
            {t('aboutReports.reportSection.processing')}
          </p>
          <p className={typography.paragraph}>
            <Trans
              i18nKey="aboutReports.reportSection.planIGN"
              components={{
                b: <strong />,
                geoportail: <ExternalLink href={EXTERNAL_LINKS.GEOPORTAIL}>{""}</ExternalLink>,
              }}
            />
          </p>
          <p className={typography.paragraph}>
            {t('aboutReports.reportSection.externalProducts')}
          </p>
          <p className={typography.paragraph}>
            <Trans
              i18nKey="aboutReports.reportSection.contact"
              components={{
                contactLink: <ExternalLink href={EXTERNAL_LINKS.CONTACT_FORM}>{""}</ExternalLink>,
              }}
            />
          </p>
        </div>
        <Divider className={styles.divider} />
        <div className={styles.legendSection}>
          <p className={typography.subtitle}>{t('aboutReports.legend.title')}</p>
          <div className={styles.legendItems}>
            {legendMap.map((item) => (
              <div key={item.status} className={styles.legendItem}>
                <div className={styles.legendItemColor} style={{ backgroundColor: item.color }} />
                <span className={typography.paragraph + " " + styles.legendItemTitle}>
                  <Trans
                    i18nKey={item.title}
                    components={{
                      b: (
                        <span style={{ fontWeight: 'bold' }} />
                      ),
                    }}
                  /></span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </SlideUpPage>
  );
}