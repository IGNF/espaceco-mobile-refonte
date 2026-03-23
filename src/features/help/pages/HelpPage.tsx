import { PageHeader } from "@/shared/ui/PageHeader";
import { SlideUpPage } from "@/shared/ui/SlideUpPage";
import { useTranslation } from "react-i18next";

import screen from '@/shared/styles/screen.module.css';
import typography from '@/shared/styles/typography.module.css';

export interface HelpPageProps {
	isOpen: boolean;
	onClose: () => void;
}

export function HelpPage({ isOpen, onClose }: HelpPageProps) {
	const { t } = useTranslation();

	return (
		<SlideUpPage isOpen={isOpen} onClose={onClose}>
			<PageHeader title={t('help.title')} onClose={onClose} />
			<main className={screen.screenContainer}>
				<h1 className={typography.title}>{t('help.title')}</h1>
				<p className={typography.subtitle}>{t('help.subtitle')}</p>
			</main>
		</SlideUpPage>
	);
}