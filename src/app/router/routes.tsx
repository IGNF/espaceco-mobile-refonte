import { createBrowserRouter, Navigate } from 'react-router-dom';
import { WelcomePage } from '@/features/welcome/pages/WelcomePage';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { HomePage } from '@/features/home/pages/HomePage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/welcome" replace />,
  },
  {
    path: '/welcome',
    element: <WelcomePage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/home',
    element: <HomePage />,
  },
]);
