export interface AppVariantConfig {
  name: string;
  displayName: string;
  fixedCommunityId?: number;
  canSwitchCommunity: boolean;
  noAccessTitle: string;
  noAccessMessage: string;
}

export const appVariant: AppVariantConfig = {
  name: "EspaceCo",
  displayName: "Espace collaboratif IGN",
  fixedCommunityId: undefined,
  canSwitchCommunity: true,
  noAccessTitle: "Aucun groupe",
  noAccessMessage: "Vous n'êtes membre d'aucun groupe. Rejoignez un groupe depuis l'Espace collaboratif pour commencer à contribuer.",
};
