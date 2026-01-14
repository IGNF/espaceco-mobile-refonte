import { useNavigate } from 'react-router-dom';
import styles from './PageHeader.module.css';

import IconArrowLeft from '@/shared/assets/icons/icon-arrow-left.svg?react';
import IconClose from '@/shared/assets/icons/icon-close.svg?react';

export interface PageHeaderProps {
	title: string;
	subtitle?: string;
	showBackButton?: boolean;
	showCloseButton?: boolean;
	onBack?: () => void;
	onClose?: () => void;
}

export function PageHeader({
	title,
	subtitle,
	showBackButton = false,
	showCloseButton = true,
	onBack,
	onClose,
}: PageHeaderProps) {
	const navigate = useNavigate();

	const handleBack = () => {
		if (onBack) {
			onBack();
		} else {
			navigate(-1);
		}
	};

	const handleClose = () => {
		if (onClose) {
			onClose();
		} else {
			navigate(-1);
		}
	};

	return (
		<header className={styles.header}>
			{showBackButton ? (
				<button
					className={styles.headerButton}
					onClick={handleBack}
					aria-label="Back"
				>
					<IconArrowLeft className={styles.headerIcon} />
				</button>
			) : (
				<div className={styles.headerSpacer} />
			)}

			<div className={styles.headerTitle}>
				<h1 className={styles.headerMainTitle}>{title}</h1>
				{subtitle && <p className={styles.headerSubtitle}>{subtitle}</p>}
			</div>

			{showCloseButton ? (
				<button
					className={styles.headerButton}
					onClick={handleClose}
					aria-label="Close"
				>
					<IconClose className={styles.headerIcon} />
				</button>
			) : (
				<div className={styles.headerSpacer} />
			)}
		</header>
	);
}
