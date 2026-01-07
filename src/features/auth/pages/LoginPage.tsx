import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import { useAuth } from "../hooks/useAuth";
import { Button } from "@/shared/ui/Button";
import { ExternalLink } from "@/shared/ui/ExternalLink";

import typography from "@/shared/styles/typography.module.css";
import inputs from "@/shared/styles/inputs.module.css";
import styles from "./LoginPage.module.css";

export function LoginPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { login, isAuthenticated } = useAuth();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");

	useEffect(() => {
		if (isAuthenticated) {
			navigate("/home", { replace: true });
		}
	}, [isAuthenticated, navigate]);

	if (isAuthenticated) {
		return null;
	}

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		await login(email, password);
		navigate("/home");
	};

	const continueWithoutAccount = () => {
		// add some anonymous flag here?
		navigate("/home");
	};

	return (
		<div className={styles.container}>
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
					<div className={styles.field}>
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
					</div>
					<div className={styles.forgotPasswordLinkContainer}>
						<ExternalLink
							href={t("login.forgotPassword")}
							className={styles.forgotPasswordLink}
						>
							{t("login.forgotPassword")}
						</ExternalLink>
					</div>

					<Button type="submit" className={styles.submitButton}>
						{t("login.submit")}
					</Button>
					<Button
						className={styles.continueWithoutAccountButton}
						type="button"
						variant="outline"
						onClick={continueWithoutAccount}
					>
						{t("login.continueWithoutAccount")}
					</Button>
				</form>
			</div>
		</div>
	);
}
