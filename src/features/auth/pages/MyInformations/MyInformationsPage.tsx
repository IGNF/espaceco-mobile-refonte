import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { SlideUpPage } from '@/shared/ui/SlideUpPage';
import { PageHeader } from '@/shared/ui/PageHeader';
import { ExternalLink } from '@/shared/ui/ExternalLink';
import { EXTERNAL_LINKS } from '@/shared/constants/externalLinks';
import typography from '@/shared/styles/typography.module.css';
import styles from './MyInformationsPage.module.css';

export interface MyInformationsPageProps {
	isOpen: boolean;
	onClose: () => void;
}

export function MyInformationsPage({ isOpen, onClose }: MyInformationsPageProps) {
	const { t } = useTranslation();
	const { user } = useAuth();

	const getFullName = (): string | null => {
		if (!user?.firstName && !user?.lastName) return null;
		return [user.firstName, user.lastName].filter(Boolean).join(' ');
	};

	const fullName = getFullName();

	return (
		<SlideUpPage isOpen={isOpen} onClose={onClose}>
			<PageHeader
				title={t('myInformations.title')}
				subtitle={t('myInformations.activeProfile')}
				onClose={onClose}
			/>

			<main className={styles.content}>
				<h2 className={typography.title}>{t('myInformations.title')}</h2>
				<p className={typography.subtitle}>{t('myInformations.subtitle')}</p>

				<div className={styles.descriptionSection}>
					<p className={`${typography.paragraph} ${typography.italic}`}>
						{t('myInformations.description')}{' '}
						<ExternalLink href={EXTERNAL_LINKS.ESPACE_COLLABORATIF}>
							{t('myInformations.espaceCo')}
						</ExternalLink>
						.
					</p>
				</div>

				<div className={styles.infoTable}>
					<div className={styles.infoRow}>
						<span className={styles.infoLabel}>{t('myInformations.username')}</span>
						<span className={styles.infoValue}>{user?.username ?? '-'}</span>
					</div>

					<div className={styles.infoRow}>
						<span className={styles.infoLabel}>{t('myInformations.fullName')}</span>
						<span className={styles.infoValue}>{fullName ?? '-'}</span>
					</div>

					<div className={styles.infoRow}>
						<span className={styles.infoLabel}>{t('myInformations.email')}</span>
						<span className={styles.infoValue}>{user?.email ?? '-'}</span>
					</div>

					<div className={styles.infoRow}>
						<span className={styles.infoLabel}>{t('myInformations.userId')}</span>
						<span className={styles.infoValue}>{user?.id ?? '-'}</span>
					</div>

					<div className={styles.infoRow}>
						<span className={styles.infoLabel}>{t('myInformations.userDescription')}</span>
						<span className={styles.infoValue}>
							{user?.description ?? t('myInformations.notProvided')}
						</span>
					</div>
				</div>
			</main>
		</SlideUpPage>
	);
}
