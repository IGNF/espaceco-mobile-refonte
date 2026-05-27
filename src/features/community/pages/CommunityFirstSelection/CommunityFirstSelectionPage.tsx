import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import type { CommunityMember } from "@ign/mobile-core";

import { useCommunitySelection } from "../../hooks/CommunityFirstSelection/useCommunitySelection";

import { Button } from "@/shared/ui/Button";

import screen from "@/shared/styles/screen.module.css";
import typography from "@/shared/styles/typography.module.css";
import inputs from "@/shared/styles/inputs.module.css";
import styles from "./CommunityFirstSelectionPage.module.css";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { joinTruthy } from "@/shared/utils/join";

export function CommunityFirstSelectionPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const {
    activeCommunities,
    selectedCommunityId,
    isLoading,
    appVariant,
    fixedCommunityId,
    canSwitchCommunity,
    hasRequiredCommunityAccess,
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

        <div className={styles.userCallout}>
          <p className={styles.userCalloutMessage}>
            {joinTruthy([user?.firstName, user?.lastName]) ? t("communitySelection.greeting", {
              name: joinTruthy([user?.firstName, user?.lastName]),
              login: user?.username,
            }) : t("communitySelection.greetingNoName", {
              login: user?.username,
            })}
          </p>
        </div>

        {/* {error && <p className={styles.error}>{error}</p>} */}

        <p className={typography.paragraph + " " + typography.italic + " " + styles.description}>
          {t("communitySelection.description")}
        </p>

        {activeCommunities && activeCommunities.length === 0 ? (
          <div className={styles.warningCallout}>
            <div className={styles.warningCalloutTitle}>
              <svg
                className={styles.warningCalloutIcon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              {fixedCommunityId !== null && !hasRequiredCommunityAccess
                ? appVariant.noAccessTitle
                : t("communitySelection.noCommunitiesTitle")}
            </div>
            <p className={styles.warningCalloutMessage}>
              {fixedCommunityId !== null && !hasRequiredCommunityAccess
                ? appVariant.noAccessMessage
                : t("communitySelection.noCommunities")}
            </p>
          </div>
        ) : (
          <>
            <div className={styles.selectWrapper}>
              <select
                id="community-select"
                className={inputs.select}
                value={selectedCommunityId ?? ""}
                onChange={handleSelectChange}
                disabled={!canSwitchCommunity}
              >
                {activeCommunities && activeCommunities.map((community: CommunityMember) => (
                  <option key={community.community_id} value={community.community_id}>
                    {community.community_name}
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

      <footer className={styles.backToLoginFooter}>
        <button
          type="button"
          className={styles.backToLoginLink}
          onClick={() => logout()}
        >
          {t("communitySelection.backToLogin")}
        </button>
      </footer>
    </div>
  );
}
