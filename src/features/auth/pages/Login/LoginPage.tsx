import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import { useAuth } from "../../hooks/useAuth";
import { Button } from "@/shared/ui/Button";
import { ExternalLink } from "@/shared/ui/ExternalLink";
import { Loading } from '@/shared/ui/Loading';
import { getAppErrorTranslationKey, isAppError } from '@/shared/errors/appError';
import { EXTERNAL_LINKS } from '@/shared/constants/externalLinks';

import screen from "@/shared/styles/screen.module.css";
import typography from "@/shared/styles/typography.module.css";
// import inputs from "@/shared/styles/inputs.module.css";
import styles from "./LoginPage.module.css";

export function LoginPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { loginWithOAuth, isAuthenticated, isLoading: isAuthLoading } = useAuth();
	// const [email, setEmail] = useState("");
	// const [password, setPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [hasInitialAuthCheckCompleted, setHasInitialAuthCheckCompleted] = useState(() => !isAuthLoading);

	useEffect(() => {
		if (!isAuthLoading) {
			setHasInitialAuthCheckCompleted(true);
		}
	}, [isAuthLoading]);

	useEffect(() => {
		console.log("isAuthenticated", isAuthenticated);
		if (hasInitialAuthCheckCompleted && isAuthenticated) {
			navigate("/community-selection", { replace: true });
		}
	}, [hasInitialAuthCheckCompleted, isAuthenticated, navigate]);

	if (!hasInitialAuthCheckCompleted || isAuthenticated) {
		return (
			<div className={styles.container + " " + screen.screenContainer}>
				<div className={styles.content + " " + styles.loadingContent}>
					<Loading size='large' label={t('login.restoringSession')} />
				</div>
			</div>
		);
	}

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setIsLoading(true);
		try {
			const loginResponse = await loginWithOAuth();
			console.log('loginResponse', loginResponse);

			// const loginResponse = await loginWithPassword(email, password);
			const isOAuthCancelled = isAppError(loginResponse.error) && loginResponse.error.code === 'oauth_cancelled';
			if (!loginResponse.success && !isOAuthCancelled) {
				setError(t(getAppErrorTranslationKey(loginResponse.error, "errors.auth.loginFailed")));
			}
		} finally {
			setIsLoading(false);
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
							href={EXTERNAL_LINKS.GEOPF_SSO_RESET_CREDENTIALS}
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
