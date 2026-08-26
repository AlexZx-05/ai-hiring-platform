"use client";

import { useEffect } from "react";
import { AuthProvider, useAuth } from "react-oidc-context";

import {
  clearAuthArtifacts,
  cognitoAuthConfig,
  getDemoSession,
  persistAuthArtifacts,
} from "@/services/auth";

import { configureAmplifyAuth } from "@/lib/amplify";

function AuthCookieSync() {
  const auth = useAuth();

  useEffect(() => {
    if (auth.isAuthenticated && auth.user?.access_token) {
      persistAuthArtifacts(
        auth.user.access_token,
        auth.user.id_token
      );
    } else if (getDemoSession()) {
      // Preserve the development-only demo workspace session.
      return;
    } else {
      clearAuthArtifacts();
    }
  }, [
    auth.isAuthenticated,
    auth.user?.access_token,
    auth.user?.id_token,
  ]);

  useEffect(() => {
    const onTokenExpired = () => {
      clearAuthArtifacts();

      localStorage.setItem(
        "auth_notice",
        "session_expired"
      );

      auth.removeUser();

      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    };

    auth.events.addAccessTokenExpired(onTokenExpired);

    return () => {
      auth.events.removeAccessTokenExpired(
        onTokenExpired
      );
    };
  }, [auth]);

  return null;
}

export function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    configureAmplifyAuth();
  }, []);

  return (
    <AuthProvider
      {...cognitoAuthConfig}
      onSigninCallback={() => {
        if (typeof window !== "undefined") {
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname
          );
        }
      }}
    >
      <AuthCookieSync />

      {children}
    </AuthProvider>
  );
}
