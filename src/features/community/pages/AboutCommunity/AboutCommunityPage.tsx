import { PageHeader } from "@/shared/ui/PageHeader";
import { SlideUpPage } from "@/shared/ui/SlideUpPage";
import { useTranslation } from "react-i18next";

import screen from '@/shared/styles/screen.module.css';
import typography from '@/shared/styles/typography.module.css';
import { useCommunity } from "../../hooks/useCommunity";

export interface AboutCommunityPageProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutCommunityPage({ isOpen, onClose }: AboutCommunityPageProps) {
  const { t } = useTranslation();
  const { activeCommunity } = useCommunity();
  console.log(activeCommunity);

  const communityDescription = activeCommunity?.editorial || activeCommunity?.description || "";

  return (
    <SlideUpPage isOpen={isOpen} onClose={onClose}>
      <PageHeader title={t('aboutCommunity.title')} subtitle={activeCommunity?.name ?? ''} onClose={onClose} />
      <main className={screen.screenContainer}>
        <h1 className={typography.title}>{t('aboutCommunity.title')}</h1>
        <p className={typography.subtitle}>{activeCommunity?.name ?? ''}</p>
        {communityDescription && communityDescription !== '' ? (
          <div
            className={typography.paragraph}
            dangerouslySetInnerHTML={{ __html: communityDescription }}
          />
        ) : (
          <p className={typography.paragraph}>{t('aboutCommunity.noDescription')}</p>
        )}
      </main>
    </SlideUpPage>
  );
}