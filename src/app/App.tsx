import { I18nProvider } from "./providers/I18nProvider";

export function App() {
	return (
		<div id="app-root">
			<I18nProvider>
				{/* Providers + Router go here */}
				<></>
			</I18nProvider>
		</div>
	);
}
