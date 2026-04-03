import type { AppCommunity } from "@/domain/community/models";
import { joinCSSClassNames } from "@/shared/utils/join";
import styles from "./CommunityRow.module.css";
import membershipStyles from "@/features/community/styles/communityMembership.module.css";
import { useTranslation } from "react-i18next";

export interface CommunityRowProps {
  isUserActiveMember: boolean;
  community: AppCommunity;
  isSelected: boolean;
  onSelect: (communityId: number) => void;
}

export function CommunityRow({ isUserActiveMember, community, isSelected, onSelect }: CommunityRowProps) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      className={joinCSSClassNames(styles.row, isSelected && styles.rowSelected, !isUserActiveMember && styles.rowPending)}
      onClick={() => isUserActiveMember && onSelect(community.id)}
      aria-pressed={isSelected}
    >
      {
        isUserActiveMember && (
          <span className={styles.radio} aria-hidden="true">
            <span className={styles.radioInner} />
          </span>
        )
      }

      {community.logo_url ? (
        <img src={community.logo_url} alt="" className={styles.logo} />
      ) : (
        <span className={styles.logoFallback} aria-hidden="true">
          {community.name.charAt(0).toUpperCase()}
        </span>
      )}

      <span className={membershipStyles.communityInfo}>
        <span className={membershipStyles.communityName}>{community.name}</span>
        {
          !isUserActiveMember && (
            <span className={membershipStyles.memberStatus}>{t("myCommunities.pendingApproval")}</span>
          )
        }
      </span>
    </button>
  );
}
