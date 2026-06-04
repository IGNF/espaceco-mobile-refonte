import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from 'react-i18next';

import { useAuth } from "../../hooks/useAuth";

import { handleOAuthCallback } from "@/infra/auth/authService";
import { appVariant } from "@/shared/config/appVariant";

import { getAppErrorTranslationKey } from '@/shared/errors/appError';

import screen from "@/shared/styles/screen.module.css";
import typography from "@/shared/styles/typography.module.css";

function canAccessFixedCommunity(userCommunityMembers: { community_id: number; role?: string }[] | undefined): boolean {
  const fixedCommunityId = appVariant.fixedCommunityId;

  return fixedCommunityId === undefined || (
    userCommunityMembers?.some((member) => member.community_id === fixedCommunityId && member.role !== 'pending') ?? false
  );
}

/**
 * Handles OAuth callback on web platform.
 * Extracts the authorization code from URL and exchanges it for tokens.
 */
export function AuthCallbackPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUserFromOAuthCallback } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function processCallback() {
      const code = searchParams.get("code");
      const errorParam = searchParams.get("error");

      if (errorParam) {
        setError(t('errors.auth.oauthCallbackFailed'));
        return;
      }

      if (!code) {
        setError(t('errors.auth.noAuthorizationCode'));
        return;
      }

      try {
        const result = await handleOAuthCallback(code);

        if (result.success && result.user) {
          await setUserFromOAuthCallback(result.user);
          if (!canAccessFixedCommunity(result.user.communities_member)) {
            navigate("/community-selection", { replace: true });
            return;
          }

          if (appVariant.fixedCommunityId !== undefined) {
            navigate("/home", { replace: true });
            return;
          }

          if (result.user.communities_member?.length === 0) {
            navigate("/home", { replace: true });
            return;
          }
          navigate("/community-selection", { replace: true });
        } else {
          setError(t(getAppErrorTranslationKey(result.error, 'errors.auth.oauthCallbackFailed')));
        }
      } catch (err) {
        setError(t(getAppErrorTranslationKey(err, 'errors.auth.oauthCallbackFailed')));
      }
    }

    processCallback();
  }, [searchParams, navigate, setUserFromOAuthCallback, t]);

  if (error) {
    return (
      <div className={screen.screenContainer} style={{ padding: "2rem", textAlign: "center" }}>
        <h1 className={typography.title}>{t('authCallback.errorTitle')}</h1>
        <p className={typography.error}>{error}</p>
        <button
          onClick={() => navigate("/login", { replace: true })}
          style={{ marginTop: "1rem", padding: "0.5rem 1rem", cursor: "pointer" }}
        >
          {t('authCallback.backToLogin')}
        </button>
      </div>
    );
  }

  return (
    <div className={screen.screenContainer} style={{ padding: "2rem", textAlign: "center" }}>
      <h1 className={typography.title}>{t('authCallback.authenticating')}</h1>
      <p>{t('authCallback.completingSignIn')}</p>
    </div>
  );
}
