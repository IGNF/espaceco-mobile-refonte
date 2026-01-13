import { useTranslation } from "react-i18next";
import { Button } from "@/shared/ui/Button";
import { type OnboardingStep, ONBOARDING_STEPS } from "../hooks/useOnboarding";
import styles from "./OnboardingModal.module.css";
import screen from "@/shared/styles/screen.module.css";

import IconClose from "@/shared/assets/icons/icon-close.svg?react";
import IconAngleLeft from "@/shared/assets/icons/icon-angle-left.svg?react";
import IconAngleRight from "@/shared/assets/icons/icon-angle-right.svg?react";
import IconCheck from "@/shared/assets/icons/icon-check.svg?react";

export interface OnboardingModalProps {
	isOpen: boolean;
	isTourMode: boolean;
	currentStep: OnboardingStep | null;
	currentStepIndex: number;
	totalSteps: number;
	onStartTour: () => void;
	onSkip: () => void;
	onNext: () => void;
	onPrevious: () => void;
	onClose: () => void;
}

export function OnboardingModal({
	isOpen,
	isTourMode,
	currentStep,
	currentStepIndex,
	totalSteps,
	onStartTour,
	onSkip,
	onNext,
	onPrevious,
	onClose,
}: OnboardingModalProps) {
	const { t } = useTranslation();

	if (!isOpen) return null;

	if (!isTourMode) {
		return (
			<div className={`${screen.overlay} ${styles.overlay}`}>
				<div className={styles.modal}>
					<button
						className={styles.closeButton}
						onClick={onSkip}
						aria-label="Close"
					>
						<IconClose className={styles.closeIcon} />
					</button>
					<h2 className={styles.title}>{t("onboarding.welcome.title")}</h2>
					<p className={styles.subtitle}>{t("onboarding.welcome.subtitle")}</p>
					<div className={styles.buttonGroup}>
						<Button color="primary" fullWidth onClick={onStartTour}>
							{t("onboarding.welcome.startTour")}
						</Button>
						<Button color="primary" variant="outline" fullWidth onClick={onSkip}>
							{t("onboarding.welcome.skipTour")}
						</Button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className={`${screen.overlay} ${styles.overlay}`} data-highlight-step={currentStep}>
			<div className={styles.modal}>
				<button
					className={styles.closeButton}
					onClick={onClose}
					aria-label="Close"
				>
					<IconClose className={styles.closeIcon} />
				</button>
				<h2 className={styles.title}>
					{t(`onboarding.steps.${currentStep}.title`)}
				</h2>
				<p className={styles.subtitle}>
					{t(`onboarding.steps.${currentStep}.subtitle`)}
				</p>
				<div className={styles.navigation}>
					{currentStepIndex > 0 && (
						<button
							className={styles.navButton}
							onClick={onPrevious}
							aria-label="Previous step"
						>
							<IconAngleLeft className={styles.navIcon} />
						</button>
					)}
					<div className={styles.dots}>
						{ONBOARDING_STEPS.map((step, index) => (
							<span
								key={step}
								className={`${styles.dot} ${index === currentStepIndex ? styles.dotActive : ""}`}
							/>
						))}
					</div>
					<button
						className={styles.navButton}
						onClick={onNext}
						aria-label={currentStepIndex === totalSteps - 1 ? "Finish" : "Next step"}
					>
						{currentStepIndex === totalSteps - 1 ? (
							<IconCheck className={styles.navIcon} />
						) : (
							<IconAngleRight className={styles.navIcon} />
						)}
					</button>
				</div>
			</div>
		</div>
	);
}
