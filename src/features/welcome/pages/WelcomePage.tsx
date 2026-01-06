import { useNavigate } from "react-router-dom";
import { useFirstRun } from "../hooks/useFirstRun";
import styles from "./WelcomePage.module.css";
import { useTranslation } from "react-i18next";
import { Trans } from "react-i18next";

export function WelcomePage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { isFirstRun, markAsSeen } = useFirstRun();

	if (isFirstRun === null) {
		return null; // or a loader
	}

	if (!isFirstRun) {
		navigate("/login");
		return null;
	}

	const handleContinue = () => {
		markAsSeen();
		navigate("/login");
	};

	return (
		<div className={styles.container}>
			<div className={styles.content}>
				<h1 className={styles.title}>{t("welcome.title")}</h1>

				<p className={styles.description}>
					<Trans i18nKey="welcome.description" components={{ br: <br /> }} />
				</p>

				<button className={styles.button} onClick={handleContinue}>
					{t("welcome.cta")}
				</button>
			</div>
		</div>
	);
}
