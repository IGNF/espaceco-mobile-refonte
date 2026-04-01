import type { AppCommunity } from "@/domain/community/models";
import { joinCSSClassNames } from "@/shared/utils/join";
import styles from "./CommunityRow.module.css";

export interface CommunityRowProps {
  community: AppCommunity;
  isSelected: boolean;
  onSelect: (communityId: number) => void;
}

export function CommunityRow({ community, isSelected, onSelect }: CommunityRowProps) {
  return (
    <button
      type="button"
      className={joinCSSClassNames(styles.row, isSelected && styles.rowSelected)}
      onClick={() => onSelect(community.id)}
      aria-pressed={isSelected}
    >
      <span className={styles.radio} aria-hidden="true">
        <span className={styles.radioInner} />
      </span>

      {community.logo_url ? (
        <img src={community.logo_url} alt="" className={styles.logo} />
      ) : (
        <span className={styles.logoFallback} aria-hidden="true">
          {community.name.charAt(0).toUpperCase()}
        </span>
      )}

      <span className={styles.name}>{community.name}</span>
    </button>
  );
}
