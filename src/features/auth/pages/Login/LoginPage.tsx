import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import { useAuth } from "../../hooks/useAuth";
import { Button } from "@/shared/ui/Button";
import { ExternalLink } from "@/shared/ui/ExternalLink";

import screen from "@/shared/styles/screen.module.css";
import typography from "@/shared/styles/typography.module.css";
// import inputs from "@/shared/styles/inputs.module.css";
import styles from "./LoginPage.module.css";

export function LoginPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { loginWithOAuth, isAuthenticated } = useAuth();
	// const [email, setEmail] = useState("");
	// const [password, setPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		console.log("isAuthenticated", isAuthenticated);
		if (isAuthenticated) {
			navigate("/community-selection", { replace: true });
		}
	}, [isAuthenticated, navigate]);

	if (isAuthenticated) {
		return null;
	}

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setIsLoading(true);
    const loginResponse = await loginWithOAuth();
    console.log('loginResponse', loginResponse);
    
		// const loginResponse = await loginWithPassword(email, password);
		setIsLoading(false);
		if (!loginResponse.success) {
			setError(loginResponse.error?.message ?? t("login.error"));
		}
	};

	return (
		<div className={styles.container + " " + screen.screenContainer}>
			<div className={styles.content}>
				<h1 className={typography.title}>{t("login.title")}</h1>
				<h2 className={typography.subtitle}>{t("login.subtitle")}</h2>
				<p
					className={
						typography.paragraph +
						" " +
						typography.italic +
						" " +
						styles.register
					}
				>
					<Trans
						i18nKey="login.register"
						components={{
							a: (
								<ExternalLink
									href="https://espacecollaboratif.ign.fr/"
									className={styles.registerLink}
								>
									{""}
								</ExternalLink>
							),
						}}
					/>
				</p>

				<form className={styles.form} onSubmit={handleLogin}>

          {/* inputs commented out because we're now using SSO and not credentials */}

					{/* <div className={styles.field}>
						<input
							id="email"
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder={t("login.loginPlaceholder")}
						/>
					</div>

					<div className={styles.field}>
						<input
							className={inputs.input}
							id="password"
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							placeholder={t("login.passwordPlaceholder")}
						/>
					</div> */}
					<div className={styles.forgotPasswordLinkContainer}>
						<ExternalLink
							href={t("login.forgotPassword")}
							className={styles.forgotPasswordLink}
						>
							{t("login.forgotPassword")}
						</ExternalLink>
					</div>

					{error && <p className={typography.error}>{error}</p>}

					<Button
						type="submit"
						className={styles.submitButton}
						loading={isLoading}
					>
						{t("login.submit")}
					</Button>
				</form>
			</div>
		</div>
	);
}
