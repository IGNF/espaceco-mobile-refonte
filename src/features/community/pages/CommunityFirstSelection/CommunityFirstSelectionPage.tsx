import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCommunitySelection } from "../../hooks/CommunityFirstSelection/useCommunitySelection";
import { Button } from "@/shared/ui/Button";

import screen from "@/shared/styles/screen.module.css";
import typography from "@/shared/styles/typography.module.css";
import styles from "./CommunityFirstSelectionPage.module.css";

export function CommunityFirstSelectionPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();

	const {
		communities,
		selectedCommunityId,
		isLoading,
		// error,
		selectCommunity,
		confirmSelection,
		isConfirming,
	} = useCommunitySelection();

	const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
		const communityId = Number(event.target.value);
		if (!isNaN(communityId)) {
			selectCommunity(communityId);
		}
	};

	const handleValidate = async () => {
		try {
			await confirmSelection();
			navigate("/home");
		} catch {
			// Error is already set in the hook
		}
	};

	if (isLoading) {
		return (
			<div className={styles.container + " " + screen.screenContainer}>
				<div className={styles.content}>
					<p>{t("common.loading")}</p>
				</div>
			</div>
		);
	}

	return (
		<div className={styles.container + " " + screen.screenContainer}>
			<div className={styles.content}>
				<h1 className={typography.title}>{t("communitySelection.title")}</h1>
				<h2 className={typography.subtitle}>
					{t("communitySelection.subtitle")}
				</h2>
				{/* {error && <p className={styles.error}>{error}</p>} */}

				<p className={typography.paragraph + " " + typography.italic + " " + styles.description}>
					{t("communitySelection.description")}
				</p>

				{communities.length === 0 ? (
					<p className={styles.empty}>
						{t("communitySelection.noCommunities")}
					</p>
				) : (
					<>
						<div className={styles.selectWrapper}>
							<select
								id="community-select"
								className={styles.select}
								value={selectedCommunityId ?? ""}
								onChange={handleSelectChange}
							>
								{communities.map((community) => (
									<option key={community.id} value={community.id}>
										{community.name}
									</option>
								))}
							</select>
						</div>

						<div className={styles.validateButtonContainer}>
							<Button
								className={styles.validateButton}
								onClick={handleValidate}
								disabled={selectedCommunityId === null || isConfirming}
							>
								{isConfirming
									? t("common.loading")
									: t("communitySelection.validate")}
							</Button>
						</div>
					</>
				)}
			</div>
		</div>
	);
}
