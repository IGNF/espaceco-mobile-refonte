export interface AppVariantConfig {
  name: string;
  displayName: string;
  fixedCommunityId?: number;
  canSwitchCommunity: boolean;
  noAccessTitle: string;
  noAccessMessage: string;
}

export const appVariant: AppVariantConfig = {
  name: "Naviforest",
  displayName: "Naviforest",
  fixedCommunityId: 658,
  canSwitchCommunity: false,
  noAccessTitle: "Accès Naviforest",
  noAccessMessage: "Votre compte ne permet pas d'accéder au guichet Naviforest.",
};
