import { SlideUpPage } from "@/shared/ui/SlideUpPage";
import { PageHeader } from "@/shared/ui/PageHeader";

import screen from "@/shared/styles/screen.module.css";
import typography from "@/shared/styles/typography.module.css";
import styles from "./LogoutPage.module.css";
import { useTranslation } from "react-i18next";
import { Button } from "@/shared/ui/Button";

export interface LogoutPageProps {
	isOpen: boolean;
	onClose: () => void;
	handleLogout: () => void;
}

export function LogoutPage({ isOpen, onClose, handleLogout }: LogoutPageProps) {
	const { t } = useTranslation();

	return (
		<SlideUpPage isOpen={isOpen} onClose={onClose}>
			<PageHeader title={t("logout.headerTitle")} onClose={onClose} />
			<main className={screen.screenContainer + " " + styles.content}>
				<h2 className={typography.title}>{t("logout.title")}</h2>
				<p className={typography.subtitle}>{t("logout.subtitle")}</p>
				<p className={typography.paragraph}>{t("logout.description")}</p>
				<div className={styles.buttonContainer}>
					<Button color="primary" onClick={handleLogout}>
						{t("logout.confirm")}
					</Button>
					<Button color="primary" variant="outline" onClick={onClose}>
						{t("logout.cancel")}
					</Button>
				</div>
			</main>
		</SlideUpPage>
	);
}
