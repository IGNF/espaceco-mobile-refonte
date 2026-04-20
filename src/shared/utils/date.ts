/**
 * Formats a date to French locale format (dd/mm/yyyy)
 */
export function formatDate(date: Date): string {
	return date.toLocaleDateString('fr-FR', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
	});
}

/**
 * Formats a time to French locale format (hh:mm:ss)
 */
export function formatTime(date: Date): string {
	return date.toLocaleTimeString('fr-FR', {
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	});
}

/**
 * Formats a date and time to French locale format (dd/mm/yyyy hh:mm:ss)
 */
export function formatDateTime(date: Date): string {
	return `${formatDate(date)} ${formatTime(date)}`;
}

/**
 * Formats an approximate duration expressed in milliseconds for short user-facing estimates.
 */
export function formatDurationFromMs(value: number): string {
	if (value > 60000 * 60) {
		const minutes = Math.round(value / 60000);
		const hours = Math.floor(minutes / 60);
		return `${hours} h ${minutes - hours * 60} min`;
	}

	const minutes = Math.round(value / 60000);
	return minutes > 0 ? `${minutes} min` : '< 1 min';
}
