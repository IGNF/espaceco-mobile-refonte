import { PageHeader } from "@/shared/ui/PageHeader";
import { SlideUpPage } from "@/shared/ui/SlideUpPage";
import { useTranslation } from "react-i18next";

import screen from '@/shared/styles/screen.module.css';
import typography from '@/shared/styles/typography.module.css';

export interface MyCommunitiesSelectionPageProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MyCommunitiesSelectionPage({ isOpen, onClose }: MyCommunitiesSelectionPageProps) {
  const { t } = useTranslation();

  return (
    <SlideUpPage isOpen={isOpen} onClose={onClose}>
      <PageHeader title={t('myCommunities.title')} onClose={onClose} showBackButton />
      <main className={screen.screenContainer}>
        <h1 className={typography.title}>{t('myCommunities.title')}</h1>
        <p className={typography.subtitle}>{t('myCommunities.subtitle')}</p>
      </main>
    </SlideUpPage>
  );
}