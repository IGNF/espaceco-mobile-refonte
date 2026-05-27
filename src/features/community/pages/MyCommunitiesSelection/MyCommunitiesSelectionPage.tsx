import { useState } from "react";
import { useTranslation } from "react-i18next";

import { EXTERNAL_LINKS } from "@/shared/constants/externalLinks";

import { useMyCommunities } from "@/features/community/hooks/MyCommunities/useMyCommunities";
import { AllCommunitiesPage } from "@/features/community/pages/AllCommunities/AllCommunitiesPage";
import { CommunityRow } from "@/features/community/components/MyCommunitiesSelection/CommunityRow";

import { Alert } from "@/shared/ui/Alert";
import { Button } from "@/shared/ui/Button";
import { ExternalLink } from "@/shared/ui/ExternalLink";
import { PageHeader } from "@/shared/ui/PageHeader";
import { SlideUpPage } from "@/shared/ui/SlideUpPage";
import { joinCSSClassNames } from "@/shared/utils/join";
import screen from "@/shared/styles/screen.module.css";
import stickyActions from "@/shared/styles/stickyActions.module.css";
import typography from "@/shared/styles/typography.module.css";

import styles from "./MyCommunitiesSelectionPage.module.css";

export interface MyCommunitiesSelectionPageProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmCommunityChange: (communityId: number) => Promise<void>;
}

export function MyCommunitiesSelectionPage({
  isOpen,
  onClose,
  onConfirmCommunityChange,
}: MyCommunitiesSelectionPageProps) {
  const { t } = useTranslation();
  const [isAllCommunitiesOpen, setIsAllCommunitiesOpen] = useState(false);
  const [isConfirmAlertOpen, setIsConfirmAlertOpen] = useState(false);
  const {
    activeCommunity,
    communities,
    activeMemberCommunityIds,
    appVariant,
    canSwitchCommunity,
    hasRequiredCommunityAccess,
    selectedCommunityId,
    isLoading,
    selectCommunity,
    resetSelection,
  } = useMyCommunities();

  const selectedCommunity = communities.find((community) => community.id === selectedCommunityId) ?? null;

  const handleClose = () => {
    setIsAllCommunitiesOpen(false);
    setIsConfirmAlertOpen(false);
    resetSelection();
    onClose();
  };

  const handleConfirmCommunityChange = async () => {
    setIsConfirmAlertOpen(false);
    resetSelection();
    await onConfirmCommunityChange(selectedCommunityId!);
  };

  return (
    <SlideUpPage isOpen={isOpen} onClose={handleClose}>
      <div className={styles.page}>
        <PageHeader
          title={t("myCommunities.title")}
          subtitle={activeCommunity?.name ?? t("myCommunities.headerSubtitle")}
          onBack={handleClose}
          onClose={handleClose}
        />

        <main className={joinCSSClassNames(screen.screenContainer, stickyActions.contentWithStickyActions, styles.content)}>
          <h1 className={typography.title}>{t("myCommunities.title")}</h1>
          <p className={typography.subtitle}>
            {canSwitchCommunity ? t("myCommunities.subtitle") : appVariant.displayName}
          </p>

          <div className={styles.descriptionSection}>
            <p className={joinCSSClassNames(typography.paragraph, typography.italic, styles.description)}>
              {canSwitchCommunity ? (
                <>
                  {t("myCommunities.description")}{" "}
                  <ExternalLink href={EXTERNAL_LINKS.ESPACE_COLLABORATIF}>
                    {t("myCommunities.espaceCo")}
                  </ExternalLink>
                  .
                </>
              ) : hasRequiredCommunityAccess ? (
                `Le guichet ${appVariant.displayName} est sélectionné automatiquement pour cette application.`
              ) : (
                appVariant.noAccessMessage
              )}
            </p>
          </div>

          {isLoading ? (
            <p className={styles.emptyState}>{t("common.loading")}</p>
          ) : communities.length > 0 ? (
            <div className={styles.communitiesList}>
              {communities.map((community) => (
                <CommunityRow
                  key={community.id}
                  isUserActiveMember={activeMemberCommunityIds.has(community.id)}
                  community={community}
                  isSelected={selectedCommunityId === community.id}
                  onSelect={selectCommunity}
                />
              ))}
            </div>
          ) : (
            <p className={styles.emptyState}>{t("myCommunities.noCommunities")}</p>
          )}
        </main>

        {canSwitchCommunity && (
          <div className={joinCSSClassNames(stickyActions.bar, styles.bar)}>
            <div className={styles.actions}>
              <Button
                fullWidth
                onClick={() => setIsConfirmAlertOpen(true)}
                disabled={selectedCommunityId === null || selectedCommunityId === activeCommunity?.id}
              >
                {t("myCommunities.switch")}
              </Button>

              <Button fullWidth variant="outline" onClick={() => setIsAllCommunitiesOpen(true)}>
                {t("myCommunities.join")}
              </Button>
            </div>
          </div>
        )}
      </div>

      <Alert
        isOpen={isConfirmAlertOpen}
        onClose={() => setIsConfirmAlertOpen(false)}
        title={t("myCommunities.confirm.title")}
      >
        <div className={styles.confirmContent}>
          <p className={styles.confirmText}>
            {t("myCommunities.confirm.message", {
              communityName: selectedCommunity?.name,
            })}
          </p>
          <p className={styles.confirmText}>
            {t("myCommunities.confirm.warning")}
          </p>

          <div className={styles.confirmActions}>
            <Button
              onClick={handleConfirmCommunityChange}
              style={{ width: "auto", margin: 0, flex: 1 }}
            >
              {t("myCommunities.confirm.confirm")}
            </Button>

            <Button
              variant="outline"
              onClick={() => setIsConfirmAlertOpen(false)}
              style={{ width: "auto", margin: 0, flex: 1 }}
            >
              {t("myCommunities.confirm.cancel")}
            </Button>
          </div>
        </div>
      </Alert>

      {canSwitchCommunity && (
        <AllCommunitiesPage
          isOpen={isAllCommunitiesOpen}
          onClose={() => setIsAllCommunitiesOpen(false)}
        />
      )}
    </SlideUpPage>
  );
}
