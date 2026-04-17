import { createBrowserRouter, Navigate } from "react-router-dom";
import { WelcomePage } from "@/features/welcome/pages/WelcomePage";
import { HomePage } from "@/features/home/pages/HomePage";
import { AuthGuard } from "./AuthGuard";

/** Login/logout routes **/
import { LoginPage } from "@/features/auth/pages/Login/LoginPage";
import { AuthCallbackPage } from "@/features/auth/pages/AuthCallback/AuthCallbackPage";
// import { LogoutPage } from "@/features/auth/pages/Logout/LogoutPage";

/** Community routes **/
import { CommunityFirstSelectionPage } from "@/features/community/pages/CommunityFirstSelection/CommunityFirstSelectionPage";
// import { AboutCommunityPage } from "@/features/community/pages/AboutCommunity/AboutCommunityPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/welcome" replace />,
  },
  {
    path: "/welcome",
    element: <WelcomePage />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/auth/callback",
    element: <AuthCallbackPage />,
  },
  {
    // Protected routes: only authenticated users can access these routes, otherwise redirect to login page
    element: <AuthGuard />,
    children: [
      {
        path: "/home",
        element: <HomePage />,
      },
      /* Community routes */
      {
        path: "/community-selection",
        element: <CommunityFirstSelectionPage />,
      },
      // {
      //   path: "/about-community",
      //   element: <AboutCommunityPage />,
      // },
    ],
  },
]);

export const overlayRoutes = [
  /* User routes (profile, logout, etc.) */
  '/my-informations', 
  '/settings',
  '/logout-verification', 
  '/my-communities',
  '/about-community',
  /* Report routes */
  '/about-reports',
  '/group-reports',
  '/my-reports',
  '/report-details',
  '/new-report-choice',
  '/create-or-edit-report',
  '/offline',
  '/about',
  '/help'
] as const;
