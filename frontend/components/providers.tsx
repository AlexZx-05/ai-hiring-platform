"use client";

import { AuthProvider } from "react-oidc-context";
import {
  clearAuthArtifacts,
  cognitoAuthConfig,
  persistAuthArtifacts,
} from "@/services/auth";
import { useAuth } from "react-oidc-context";
import { useEffect } from "react";
import { configureAmplifyAuth } from "@/lib/amplify";

function AuthCookieSync() {
  const auth = useAuth();

  useEffect(() => {
    if (auth.isAuthenticated && auth.user?.access_token) {
      persistAuthArtifacts(auth.user.access_token, auth.user.id_token);
      return;
    }

    clearAuthArtifacts();
  }, [auth.isAuthenticated, auth.user?.access_token, auth.user?.id_token]);

  useEffect(() => {
    const onTokenExpired = () => {
      clearAuthArtifacts();
      localStorage.setItem("auth_notice", "session_expired");
      auth.removeUser();
      window.location.assign("/login");
    };

    auth.events.addAccessTokenExpired(onTokenExpired);
    return () => {
      auth.events.removeAccessTokenExpired(onTokenExpired);
    };
  }, [auth]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  configureAmplifyAuth();

  return (
    <AuthProvider
      {...cognitoAuthConfig}
      onSigninCallback={() => {
        window.history.replaceState({}, document.title, window.location.pathname);
      }}
    >
      <AuthCookieSync />
      {children}
    </AuthProvider>
  );
}
