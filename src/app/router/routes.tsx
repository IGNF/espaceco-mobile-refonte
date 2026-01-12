import { createBrowserRouter, Navigate } from "react-router-dom";
import { WelcomePage } from "@/features/welcome/pages/WelcomePage";
import { HomePage } from "@/features/home/pages/HomePage";
import { AuthGuard } from "./AuthGuard";

/** Login/info/logout routes **/
import { LoginPage } from "@/features/auth/pages/Login/LoginPage";
import { LogoutPage } from "@/features/auth/pages/Logout/LogoutPage";
import { MyInformationsPage } from "@/features/auth/pages/MyInformations/MyInformationsPage";

/** Community routes **/
import { CommunityFirstSelectionPage } from "@/features/community/pages/CommunityFirstSelection/CommunityFirstSelectionPage";
import { AboutCommunityPage } from "@/features/community/pages/AboutCommunity/AboutCommunityPage";
import { MyCommunitiesSelectionPage } from "@/features/community/pages/MyCommunitiesSelection/MyCommunitiesSelectionPage";

/** Contribution routes **/
import { AboutContributionsPage } from "@/features/contribution/pages/AboutContributions/AboutContributionsPage";
import { ContributionDetailsPage } from "@/features/contribution/pages/ContributionDetails/ContributionDetailsPage";
import { GroupContributionsPage } from "@/features/contribution/pages/GroupContributions/GroupContributionsPage";
import { MyContributionsPage } from "@/features/contribution/pages/MyContributions/MyContributionsPage";
import { NewContributionPage } from "@/features/contribution/pages/NewContribution/NewContributionPage";

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
		// Protected routes: only authenticated users can access these routes, otherwise redirect to login page
		element: <AuthGuard />,
		children: [
			{
				path: "/my-informations",
				element: <MyInformationsPage />,
			},
			{
				path: "/logout",
				element: <LogoutPage />,
			},
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
      /* Contribution routes */
			{
				path: "/about-contributions",
				element: <AboutContributionsPage />,
			},
			{
				path: "/contribution-details",
				element: <ContributionDetailsPage />,
			},
			{
				path: "/group-contributions",
				element: <GroupContributionsPage />,
			},
			{
				path: "/my-contributions",
				element: <MyContributionsPage />,
			},
			{
				path: "/new-contribution",
				element: <NewContributionPage />,
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
