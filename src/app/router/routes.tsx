import { createBrowserRouter, Navigate } from 'react-router-dom';
import { WelcomePage } from '@/features/welcome/pages/WelcomePage';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { HomePage } from '@/features/home/pages/HomePage';
import { AuthGuard } from './AuthGuard';

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
    // Protected routes: only authenticated users can access these routes, otherwise redirect to login page
    element: <AuthGuard />,
    children: [
      {
        path: '/home',
        element: <HomePage />,
      },
    ],
  },
]);
