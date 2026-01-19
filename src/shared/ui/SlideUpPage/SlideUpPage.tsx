import { useEffect, useState, type ReactNode } from 'react';
import styles from './SlideUpPage.module.css';

const ANIMATION_DURATION = 300; //ms, matches CSS transition duration

export interface SlideUpPageProps {
	children: ReactNode;
	isOpen: boolean;
	onClose: () => void;
	className?: string;
}

export function SlideUpPage({ children, isOpen, className }: SlideUpPageProps) {
	const [isVisible, setIsVisible] = useState(isOpen);
	const [shouldRender, setShouldRender] = useState(isOpen);

	if (isOpen && !shouldRender) {
		setShouldRender(true);
	}
	if (!isOpen && isVisible) {
		setIsVisible(false);
	}

	useEffect(() => {
		if (isOpen) {
			const timer = setTimeout(() => {
				setIsVisible(true);
			}, 20);
			return () => clearTimeout(timer);
		} else {
			const timer = setTimeout(() => {
				setShouldRender(false);
        // onClose();
			}, ANIMATION_DURATION);
			return () => clearTimeout(timer);
		}
	}, [isOpen]);

	if (!shouldRender) return null;

	const classNames = [
		styles.slideUpPage,
		isVisible ? styles.slideUpPageVisible : '',
		className ?? '',
	].filter(Boolean).join(' ');

	return (
		<div className={classNames}>
			<div className={styles.slideUpPageInner}>
				{children}
			</div>
		</div>
	);
}