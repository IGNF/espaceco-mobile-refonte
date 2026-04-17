import { PageHeader } from "@/shared/ui/PageHeader";
import { SlideUpPage } from "@/shared/ui/SlideUpPage";
import { useTranslation } from "react-i18next";

import screen from '@/shared/styles/screen.module.css';
import typography from '@/shared/styles/typography.module.css';

export interface AboutReportsPageProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutReportsPage({ isOpen, onClose }: AboutReportsPageProps) {
	const { t } = useTranslation();

	return (
		<SlideUpPage isOpen={isOpen} onClose={onClose}>
			<PageHeader title="About Reports" onClose={onClose} />
			<main className={screen.screenContainer}>
				<h1 className={typography.title}>{t('aboutReports.title')}</h1>
				<p className={typography.subtitle}>{t('aboutReports.subtitle')}</p>
			</main>
		</SlideUpPage>
	);
}