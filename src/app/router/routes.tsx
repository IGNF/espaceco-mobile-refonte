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
import { AboutCommunityPage } from "@/features/community/pages/AboutCommunity/AboutCommunityPage";
import { MyCommunitiesSelectionPage } from "@/features/community/pages/MyCommunitiesSelection/MyCommunitiesSelectionPage";

/** Report routes **/
import { AboutReportsPage } from "@/features/report/pages/AboutReports/AboutReportsPage";
import { ReportDetailsPage } from "@/features/report/pages/ReportDetails/ReportDetailsPage";
import { GroupReportsPage } from "@/features/report/pages/GroupReports/GroupReportsPage";
import { MyReportsPage } from "@/features/report/pages/MyReports/MyReportsPage";
import { NewReportPage } from "@/features/report/pages/NewReport/NewReportPage";

/** Help, About, Settings routes **/
import { HelpPage } from "@/features/help/pages/HelpPage";
import { AboutPage } from "@/features/about/pages/AboutPage";
import { SettingsPage } from "@/features/settings/pages/SettingsPage";


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
			// {
			// 	path: "/logout",
			// 	element: <LogoutPage />,
			// },
			{
				path: "/home",
				element: <HomePage />,
			},
      /* Community routes */
			{
				path: "/community-selection",
				element: <CommunityFirstSelectionPage />,
			},
			{
				path: "/about-community",
				element: <AboutCommunityPage />,
			},
			{
				path: "/my-communities",
				element: <MyCommunitiesSelectionPage />,
			},
      /* Report routes */
			{
				path: "/about-reports",
				element: <AboutReportsPage />,
			},
			{
				path: "/report-details",
				element: <ReportDetailsPage />,
			},
			{
				path: "/group-reports",
				element: <GroupReportsPage />,
			},
			{
				path: "/my-reports",
				element: <MyReportsPage />,
			},
			{
				path: "/new-report",
				element: <NewReportPage />,
			},
      /* Help, About, Settings routes */
			{
				path: "/help",
				element: <HelpPage />,
			},
			{
				path: "/about",
				element: <AboutPage />,
			},
			{
				path: "/settings",
				element: <SettingsPage />,
			},
		],
	},
]);

export const overlayRoutes = ['/my-informations', '/logout-verification'] as const;
