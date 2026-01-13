import { useState, useCallback } from "react";

const ONBOARDING_STORAGE_KEY = "espaceco_onboarding_completed";

export type OnboardingStep =
	| "signalement"
	| "guichet"
	| "couches"
	| "geolocation"
	| "menu"
	| "search";

export const ONBOARDING_STEPS: OnboardingStep[] = [
	"signalement",
	"guichet",
	"couches",
	"geolocation",
	"menu",
	"search",
];

export interface UseOnboardingReturn {
	isOnboardingCompleted: boolean;
	showModal: boolean;
	isTourMode: boolean;
	currentStepIndex: number;
	currentStep: OnboardingStep | null;
	totalSteps: number;
	startTour: () => void;
	skipOnboarding: () => void;
	nextStep: () => void;
	previousStep: () => void;
	closeOnboarding: () => void;
}

export function useOnboarding(): UseOnboardingReturn {
	const [isOnboardingCompleted, setIsOnboardingCompleted] = useState(() => {
		return localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true";
	});
	const [isTourMode, setIsTourMode] = useState(false);
	const [currentStepIndex, setCurrentStepIndex] = useState(0);

	const markOnboardingComplete = useCallback(() => {
		localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
		setIsOnboardingCompleted(true);
	}, []);

	const startTour = useCallback(() => {
		setIsTourMode(true);
		setCurrentStepIndex(0);
	}, []);

	const skipOnboarding = useCallback(() => {
		markOnboardingComplete();
		setIsTourMode(false);
	}, [markOnboardingComplete]);

	const nextStep = useCallback(() => {
		if (currentStepIndex < ONBOARDING_STEPS.length - 1) {
			setCurrentStepIndex((prev) => prev + 1);
		} else {
			markOnboardingComplete();
			setIsTourMode(false);
		}
	}, [currentStepIndex, markOnboardingComplete]);

	const previousStep = useCallback(() => {
		if (currentStepIndex > 0) {
			setCurrentStepIndex((prev) => prev - 1);
		}
	}, [currentStepIndex]);

	const closeOnboarding = useCallback(() => {
		markOnboardingComplete();
		setIsTourMode(false);
	}, [markOnboardingComplete]);

	return {
		isOnboardingCompleted,
		showModal: !isOnboardingCompleted,
		isTourMode,
		currentStepIndex,
		currentStep: isTourMode ? ONBOARDING_STEPS[currentStepIndex] : null,
		totalSteps: ONBOARDING_STEPS.length,
		startTour,
		skipOnboarding,
		nextStep,
		previousStep,
		closeOnboarding,
	};
}
