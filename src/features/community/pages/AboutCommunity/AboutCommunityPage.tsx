import { PageHeader } from "@/shared/ui/PageHeader";
import { SlideUpPage } from "@/shared/ui/SlideUpPage";
import { useTranslation } from "react-i18next";

import screen from '@/shared/styles/screen.module.css';
import typography from '@/shared/styles/typography.module.css';

export interface AboutCommunityPageProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutCommunityPage({ isOpen, onClose }: AboutCommunityPageProps) {
	const { t } = useTranslation();

	return (
		<SlideUpPage isOpen={isOpen} onClose={onClose}>
			<PageHeader title="About Community" onClose={onClose} />
			<main className={screen.screenContainer}>
				<h1 className={typography.title}>{t('aboutCommunity.title')}</h1>
				<p className={typography.subtitle}>{t('aboutCommunity.subtitle')}</p>
			</main>
		</SlideUpPage>
	);
}