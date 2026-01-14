import { useEffect, useState, type ReactNode } from 'react';
import styles from './SlideUpPage.module.css';

const ANIMATION_DURATION = 300; // ms - matches CSS transition duration

export interface SlideUpPageProps {
	children: ReactNode;
	isOpen: boolean;
	onClose: () => void;
	className?: string;
}

export function SlideUpPage({ children, isOpen, onClose, className }: SlideUpPageProps) {
	const [isVisible, setIsVisible] = useState(false);
	const [shouldRender, setShouldRender] = useState(false);

	useEffect(() => {
		if (isOpen) {
			// Mount the component, then trigger animation
			setShouldRender(true);
			const timer = setTimeout(() => {
				setIsVisible(true);
			}, 20);
			return () => clearTimeout(timer);
		} else {
			// Trigger exit animation, then unmount
			setIsVisible(false);
			const timer = setTimeout(() => {
				setShouldRender(false);
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

export { ANIMATION_DURATION as SLIDE_ANIMATION_DURATION };
