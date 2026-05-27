import { useState } from "react";
import { useTranslation } from "react-i18next";
import styles from "./LeftMenu.module.css";
import screen from "@/shared/styles/screen.module.css";

import IconLocation from "@/shared/assets/icons/icon-location.svg?react";
import IconGuichet from "@/shared/assets/icons/icon-guichet.svg?react";
import IconUser from "@/shared/assets/icons/icon-user.svg?react";
import IconConfiguration from "@/shared/assets/icons/icon-configuration.svg?react";
import IconHelp from "@/shared/assets/icons/icon-help.svg?react";
import IconInfo from "@/shared/assets/icons/icon-info.svg?react";
import IconAngleDown from "@/shared/assets/icons/icon-angle-down.svg?react";
import IconCheck from '@/shared/assets/icons/icon-check.svg?react';

import type { AppUser } from "@/domain/user/models";
import { useCommunity } from "@/features/community/hooks/useCommunity";
import { useOffline } from "@/features/offline/hooks/useOffline";

export interface LeftMenuProps {
  isOpen: boolean;
  onClose: () => void;
  user?: AppUser;
  onNavigate?: (route: string) => void;
}

type MenuGroupId = "signalements" | "guichet" | "monCompte";

interface MenuItem {
  id: string;
  labelKey: string;
  route: string;
}

interface MenuGroup {
  id: MenuGroupId;
  titleKey: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    id: "signalements",
    titleKey: "leftMenu.signalements.title",
    icon: IconLocation,
    items: [
      { id: "signalementsGroupe", labelKey: "leftMenu.signalements.signalementsGroupe", route: "/group-reports" },
      { id: "mesSignalements", labelKey: "leftMenu.signalements.mesSignalements", route: "/my-reports" },
      { id: "nouveauSignalement", labelKey: "leftMenu.signalements.nouveauSignalement", route: "/new-report-choice" },
      { id: "aProposSignalements", labelKey: "leftMenu.signalements.aPropos", route: "/about-reports" },
    ],
  },
  {
    id: "guichet",
    titleKey: "leftMenu.guichet.title",
    icon: IconGuichet,
    items: [
      // { id: "guichet", labelKey: "leftMenu.guichet.guichet", route: "/my-layers" },
      { id: "modeHorsLigne", labelKey: "leftMenu.guichet.modeHorsLigne", route: "/offline" },
      { id: "aProposGuichet", labelKey: "leftMenu.guichet.aPropos", route: "/about-community" },
    ],
  },
  {
    id: "monCompte",
    titleKey: "leftMenu.monCompte.title",
    icon: IconUser,
    items: [
      { id: "mesInformations", labelKey: "leftMenu.monCompte.mesInformations", route: "/my-informations" },
      { id: "mesGroupes", labelKey: "leftMenu.monCompte.mesGroupes", route: "/my-communities" },
      { id: "deconnexion", labelKey: "leftMenu.monCompte.deconnexion", route: "/logout-verification" },
    ],
  },
];

interface StandaloneItem {
  id: string;
  labelKey: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  route: string;
}

const standaloneItems: StandaloneItem[] = [
  { id: "parametres", labelKey: "leftMenu.parametres", icon: IconConfiguration, route: "/settings" },
  { id: "aide", labelKey: "leftMenu.aide", icon: IconHelp, route: "/help" },
  { id: "aPropos", labelKey: "leftMenu.aPropos", icon: IconInfo, route: "/about" },
];

export function LeftMenu({ isOpen, onClose, user, onNavigate }: LeftMenuProps) {
  const { t } = useTranslation();
  const { activeCommunity, canSwitchCommunity } = useCommunity();
  const { mode } = useOffline();

  const [expandedGroups, setExpandedGroups] = useState<Set<MenuGroupId>>(
    new Set([])
  );
  const isOffline = mode === "offline";

  const toggleGroup = (groupId: MenuGroupId) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const handleItemClick = (route: string) => {
    // Close the menu first
    onClose();

    // Wait for menu close animation before navigating
    setTimeout(() => {
      onNavigate?.(route);
    }, 300);
  };

  const handleOverlayClick = () => {
    onClose();
  };

  return (
    <>
      <div
        className={`${screen.overlay} ${styles.overlay} ${isOpen ? styles.overlayVisible : ""}`}
        onClick={handleOverlayClick}
        aria-hidden="true"
      />
      <nav
        className={`${styles.menu} ${isOpen ? styles.menuOpen : ""}`}
        aria-label="Main menu"
        aria-hidden={!isOpen}
      >
        {/* User profile section */}
        {user && (
          <div className={styles.userSection}>
            <div className={styles.avatar}>
              {activeCommunity?.logo_url ? (
                <img src={activeCommunity?.logo_url} alt={activeCommunity?.name} className={styles.avatarImage} />
              ) : (
                <div className={styles.avatarPlaceholder}>
                  {activeCommunity?.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user.username}</span>
              {activeCommunity && (
                <span className={styles.userLocation}>{activeCommunity.name}</span>
              )}
            </div>
          </div>
        )}

        {/* Menu groups */}
        <div className={styles.menuContent}>
          {menuGroups.map((group) => {
            const IconComponent = group.icon;
            const isExpanded = expandedGroups.has(group.id);
            const items = group.items.filter((item) => canSwitchCommunity || item.id !== 'mesGroupes');

            return (
              <div key={group.id} className={styles.menuGroup}>
                <button
                  className={styles.groupHeader}
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={isExpanded}
                >
                  <IconComponent className={styles.groupIcon} />
                  <span className={styles.groupTitle}>{t(group.titleKey)}</span>
                  <IconAngleDown
                    className={`${styles.chevron} ${isExpanded ? styles.chevronExpanded : ""}`}
                  />
                </button>
                <div
                  className={`${styles.groupItems} ${isExpanded ? styles.groupItemsExpanded : ""}`}
                >
                  {items.map((item) => (
                    <button
                      key={item.id}
                      className={`${styles.menuItem} ${isOffline && item.id === "modeHorsLigne" ? styles.menuItemOffline : ""}`}
                      onClick={() => handleItemClick(item.route)}
                    >
                      {isOffline && item.id === "modeHorsLigne" ? (
                        <IconCheck  className={styles.offlineModeIcon} />
                      ) : null
                      }
                      {t(item.labelKey)}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Standalone items */}
          <div className={styles.standaloneItems}>
            {standaloneItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <button
                  key={item.id}
                  className={styles.standaloneItem}
                  onClick={() => handleItemClick(item.route)}
                >
                  <IconComponent className={styles.standaloneIcon} />
                  <span>{t(item.labelKey)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
