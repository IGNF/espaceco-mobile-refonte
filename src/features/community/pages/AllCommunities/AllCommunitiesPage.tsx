import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAllCommunities } from "@/features/community/hooks/AllCommunities/useAllCommunities";
import { useCommunity } from "@/features/community/hooks/useCommunity";
import { Button } from "@/shared/ui/Button";
import { Loading } from "@/shared/ui/Loading";
import { PageHeader } from "@/shared/ui/PageHeader";
import { SlideUpPage } from "@/shared/ui/SlideUpPage";
import IconSearch from "@/shared/assets/icons/icon-search.svg?react";

import listStyles from "@/features/report/pages/reportsListPage.module.css";
import screen from "@/shared/styles/screen.module.css";
import typography from "@/shared/styles/typography.module.css";
import styles from "./AllCommunitiesPage.module.css";

export interface AllCommunitiesPageProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AllCommunitiesPage({ isOpen, onClose }: AllCommunitiesPageProps) {
  const { t } = useTranslation();
  const [searchValue, setSearchValue] = useState("");
  const [appliedSearchTerm, setAppliedSearchTerm] = useState("");
  const { communities, isLoading, isLoadingMore, error, hasMore, loadMore } = useAllCommunities(isOpen, appliedSearchTerm);
  const { communities: userCommunities } = useCommunity();
  const sentinelRef = useRef<HTMLDivElement>(null);

  const handleClose = () => {
    handleResetSearch();
    onClose();
  };

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAppliedSearchTerm(searchValue.trim());
  };

  const handleResetSearch = () => {
    setSearchValue("");
    setAppliedSearchTerm("");
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleScroll = () => {
      const sentinel = sentinelRef.current;
      if (!sentinel || !hasMore || isLoadingMore || isLoading) {
        return;
      }

      const rect = sentinel.getBoundingClientRect();
      const isVisible = rect.top <= window.innerHeight + 200;

      if (isVisible) {
        void loadMore();
      }
    };

    window.addEventListener("scroll", handleScroll, true);
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [hasMore, isLoading, isLoadingMore, isOpen, loadMore]);

  const renderContent = () => {
    if (isLoading) {
      return <Loading label={t("allCommunities.loading")} />;
    }

    if (error && communities.length === 0) {
      return <div className={listStyles.error}>{t("allCommunities.error")}</div>;
    }

    if (communities.length === 0) {
      return <div className={listStyles.empty}>{t("allCommunities.empty")}</div>;
    }

    return (
      <>
        <p className={listStyles.count}>
          <strong>
            {communities.length} {communities.length > 1 ? t("allCommunities.countPlural") : t("allCommunities.countSingular")}
          </strong>
        </p>

        <div className={listStyles.reportList}>
          {communities.map((community) => (
            <div key={community.id} className={styles.communityRow}>
              {community.logo_url ? (
                <img src={community.logo_url} alt="" className={styles.communityLogo} />
              ) : (
                <span className={styles.communityLogoFallback} aria-hidden="true">
                  {community.name.charAt(0).toUpperCase()}
                </span>
              )}

              <span className={styles.communityName}>{community.name}</span>

              {
                !userCommunities.some((userCommunity) => userCommunity.id === community.id) && (
                  <Button variant="solid" color="primary" className={styles.joinButton}>
                    {t("allCommunities.join")}
                  </Button>
                )
              }
            </div>
          ))}

          <div ref={sentinelRef} className={listStyles.sentinel} />

          {isLoadingMore && (
            <Loading size="small" />
          )}

          {!hasMore && communities.length > 0 && (
            <div className={listStyles.endOfList}>
              {t("allCommunities.noMoreCommunities")}
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <SlideUpPage isOpen={isOpen} onClose={handleClose} level={2}>
      <PageHeader
        title={t("allCommunities.headerTitle")}
        subtitle={t("allCommunities.headerSubtitle")}
        showBackButton
        onBack={handleClose}
        onClose={handleClose}
      />

      <main className={`${screen.screenContainer} ${styles.content}`}>
        <div className={listStyles.titleSection}>
          <h1 className={typography.title}>{t("allCommunities.title")}</h1>
          <p className={typography.subtitle}>{t("allCommunities.subtitle")}</p>
        </div>

        <div className={styles.descriptionSection}>
          <p className={`${typography.paragraph} ${typography.italic} ${styles.description}`}>
            {t("allCommunities.description")}
          </p>
        </div>

        <form className={styles.searchSection} onSubmit={handleSearch}>
          <input
            type="text"
            className={styles.searchInput}
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder={t("allCommunities.searchPlaceholder")}
          />
          <button type="submit" className={styles.searchButton} aria-label={t("allCommunities.search")}>
            <IconSearch className={styles.searchIcon} />
          </button>
        </form>

        {(searchValue.length > 0 || appliedSearchTerm.length > 0) && (
          <button type="button" className={styles.resetSearchButton} onClick={handleResetSearch}>
            {t("allCommunities.resetSearch")}
          </button>
        )}

        {renderContent()}
      </main>
    </SlideUpPage>
  );
}
