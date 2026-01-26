import { useGroupReports } from '@/features/report/hooks/useGroupReports';
import { useCommunity } from '@/features/community/hooks/useCommunity';

export function GroupReportsPage() {
	const { activeCommunity, isLoading: isCommunityLoading } = useCommunity();
	const { reports, isLoading, error } = useGroupReports();

	if (isCommunityLoading) {
		return <div>Loading community...</div>;
	}

	if (!activeCommunity) {
		return <div>No active community selected</div>;
	}

	if (isLoading) {
		return <div>Loading reports...</div>;
	}

	if (error) {
		return <div>Error: {error.message}</div>;
	}

	return (
		<div>
			<h1>Group Reports - {activeCommunity.name}</h1>
			<p>{reports.length} report(s) found</p>
			<ul>
				{reports.map((report) => (
					<li key={report.id}>
						Report #{report.id} - {report.status} - {report.comment?.substring(0, 50)}
					</li>
				))}
			</ul>
		</div>
	);
}
