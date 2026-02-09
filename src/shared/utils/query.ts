export function stripQueryParams(url: string): string {
	try {
		const parsed = new URL(url);
		return parsed.origin + parsed.pathname;
	} catch {
		return url.split("?")[0];
	}
}