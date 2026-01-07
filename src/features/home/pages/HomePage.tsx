import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Button } from '@/shared/ui/Button';
import styles from './HomePage.module.css';

export function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t('home.title')}</h1>
      </header>

      <main className={styles.main}>
        <p className={styles.welcome}>
          {t('home.welcome')}{user?.name ? `, ${user.name}` : ''}
        </p>
      </main>

      <footer className={styles.footer}>
        <Button color="danger" variant="outline" onClick={handleLogout}>
          {t('home.logout')}
        </Button>
      </footer>
    </div>
  );
}
