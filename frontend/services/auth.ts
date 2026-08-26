const region =
  process.env.NEXT_PUBLIC_COGNITO_REGION ??
  process.env.NEXT_PUBLIC_AWS_REGION ??
  "ap-south-1";
const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID ?? "";
const issuer =
  process.env.NEXT_PUBLIC_COGNITO_AUTHORITY ??
  `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
const domain = (
  process.env.NEXT_PUBLIC_COGNITO_DOMAIN ??
  "https://your-domain-prefix.auth.ap-south-1.amazoncognito.com"
).replace(/\/+$/, "");
const clientId =
  process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? "";
const redirectUri =
  process.env.NEXT_PUBLIC_COGNITO_REDIRECT_URI ?? "http://localhost:3000/login";
const logoutRedirectUri =
  process.env.NEXT_PUBLIC_COGNITO_LOGOUT_REDIRECT_URI ??
  "http://localhost:3000/login";
const cognitoScopes = "openid email phone aws.cognito.signin.user.admin";
const DEMO_SESSION_KEY = "hireai_demo_session";

export type DemoRole = "candidate" | "recruiter";

export type DemoSession = {
  role: DemoRole;
  name: string;
  email: string;
};

const demoProfiles: Record<DemoRole, DemoSession> = {
  candidate: {
    role: "candidate",
    name: "Aarav Sharma",
    email: "aarav.sharma@example.com",
  },
  recruiter: {
    role: "recruiter",
    name: "Priya Mehta",
    email: "priya.mehta@talentflow.example",
  },
};

export const demoLoginEnabled =
  process.env.NODE_ENV !== "production" ||
  process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN === "true";

export const cognitoAuthConfig = {
  authority: issuer,
  metadata: {
    issuer,
    authorization_endpoint: `${domain}/oauth2/authorize`,
    token_endpoint: `${domain}/oauth2/token`,
    userinfo_endpoint: `${domain}/oauth2/userInfo`,
    end_session_endpoint: `${domain}/logout`,
    jwks_uri: `${issuer}/.well-known/jwks.json`,
  },
  client_id: clientId,
  redirect_uri: redirectUri,
  post_logout_redirect_uri: logoutRedirectUri,
  response_type: "code",
  scope: cognitoScopes,
};

export function clearAuthArtifacts(): void {
  if (typeof document !== "undefined") {
    document.cookie =
      "auth_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
    document.cookie =
      "user_role=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
  }
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem("auth_access_token");
    localStorage.removeItem("auth_id_token");
    localStorage.removeItem(DEMO_SESSION_KEY);
  }
}

export function startDemoSession(role: DemoRole): DemoSession {
  const profile = demoProfiles[role];
  if (typeof document !== "undefined") {
    document.cookie = `auth_token=demo-${role}; Path=/; SameSite=Lax`;
    document.cookie = `user_role=${role}; Path=/; SameSite=Lax`;
  }
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(profile));
  }
  return profile;
}

export function getDemoSession(): DemoSession | null {
  if (typeof localStorage === "undefined") {
    return null;
  }
  try {
    const value = JSON.parse(localStorage.getItem(DEMO_SESSION_KEY) ?? "null") as DemoSession | null;
    if (value?.role && value?.name && value?.email) {
      return value;
    }
  } catch {
    // A malformed browser value should behave like no session.
  }
  return null;
}

export function persistAuthArtifacts(
  accessToken?: string,
  idToken?: string
): void {
  if (!accessToken) {
    clearAuthArtifacts();
    return;
  }

  if (typeof document !== "undefined") {
    document.cookie = `auth_token=${encodeURIComponent(
      accessToken
    )}; Path=/; SameSite=Lax`;
  }
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("auth_access_token", accessToken);
  }

  if (!idToken) {
    return;
  }

  if (typeof localStorage !== "undefined") {
    localStorage.setItem("auth_id_token", idToken);
  }
  if (typeof document !== "undefined") {
    const role = getUserRoleFromIdToken(idToken);
    document.cookie = `user_role=${encodeURIComponent(
      role
    )}; Path=/; SameSite=Lax`;
  }
}

export function getCognitoLogoutUrl(): string {
  const params = new URLSearchParams({
    client_id: clientId,
    logout_uri: logoutRedirectUri,
  });
  return `${domain}/logout?${params.toString()}`;
}

export function getCognitoAuthorizeUrl(loginHint?: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    scope: cognitoScopes,
    redirect_uri: redirectUri,
  });
  if (loginHint) {
    params.set("login_hint", loginHint);
  }
  return `${domain}/oauth2/authorize?${params.toString()}`;
}

type JwtPayload = {
  "cognito:groups"?: string[];
  "custom:role"?: string;
};

function decodeJwtPayload(token?: string): JwtPayload | null {
  if (!token) {
    return null;
  }
  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }
  try {
    const payload = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(payload) as JwtPayload;
  } catch {
    return null;
  }
}

export function getUserRoleFromIdToken(idToken?: string): string {
  const payload = decodeJwtPayload(idToken);
  if (!payload) {
    return "candidate";
  }
  if (payload["custom:role"]) {
    return payload["custom:role"];
  }
  if (payload["cognito:groups"]?.includes("admin")) {
    return "admin";
  }
  if (payload["cognito:groups"]?.includes("recruiter")) {
    return "recruiter";
  }
  return "candidate";
}

export function getEffectiveUserRole(idToken?: string): string {
  return getDemoSession()?.role ?? getUserRoleFromIdToken(idToken);
}
