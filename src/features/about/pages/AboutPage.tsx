import { useTranslation } from "react-i18next";

import { PageHeader } from "@/shared/ui/PageHeader";
import { SlideUpPage } from "@/shared/ui/SlideUpPage";

import screen from '@/shared/styles/screen.module.css';
import typography from '@/shared/styles/typography.module.css';

export interface AboutPageProps {
	isOpen: boolean;
	onClose: () => void;
}

export function AboutPage({ isOpen, onClose }: AboutPageProps) {
	const { t } = useTranslation();

	return (
		<SlideUpPage isOpen={isOpen} onClose={onClose}>
			<PageHeader title="About" onClose={onClose} />
			<main className={screen.screenContainer}>
				<h1 className={typography.title}>{t('about.title')}</h1>
				<p className={typography.subtitle}>{t('about.subtitle')}</p>
			</main>
		</SlideUpPage>
	);
}