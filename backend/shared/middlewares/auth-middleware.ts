import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { AppRole, AuthContext } from "../types/auth.js";

const REGION = process.env.COGNITO_REGION ?? "ap-south-1";
const USER_POOL_ID =
  process.env.COGNITO_USER_POOL_ID ?? "ap-south-1_qaHo29dGX";
const CLIENT_ID = process.env.COGNITO_CLIENT_ID ?? "67t6ib5en6cdis6cvi8dk1ub7l";

const issuer = `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`;
const jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));

function parseBearerToken(event: APIGatewayProxyEventV2): string | null {
  const header =
    event.headers.authorization ?? event.headers.Authorization ?? "";
  if (!header.toLowerCase().startsWith("bearer ")) {
    return null;
  }
  return header.slice(7).trim();
}

function resolveRole(claims: Record<string, unknown>): AppRole {
  const groups = claims["cognito:groups"];
  if (Array.isArray(groups)) {
    if (groups.includes("admin")) {
      return "admin";
    }
    if (groups.includes("recruiter")) {
      return "recruiter";
    }
  }

  // Browser-controlled custom attributes must never grant privileged access.
  return "candidate";
}

export async function verifyAccessToken(
  event: APIGatewayProxyEventV2
): Promise<AuthContext> {
  const token = parseBearerToken(event);
  if (!token) {
    throw new Error("Missing bearer token");
  }

  const { payload } = await jwtVerify(token, jwks, { issuer });

  const tokenUse = payload.token_use;
  if (tokenUse !== "access" && tokenUse !== "id") {
    throw new Error("Invalid token_use");
  }
  if (tokenUse === "id" && payload.aud !== CLIENT_ID) {
    throw new Error("Invalid token audience");
  }
  if (tokenUse === "access" && payload.client_id !== CLIENT_ID) {
    throw new Error("Invalid token client");
  }

  const groups = Array.isArray(payload["cognito:groups"])
    ? (payload["cognito:groups"] as string[])
    : [];
  const tenantIdClaim = payload["custom:tenantId"];
  const tenantId = typeof tenantIdClaim === "string" ? tenantIdClaim.trim() : "";
  const role = resolveRole(payload as Record<string, unknown>);
  if (!tenantId && role !== "candidate") {
    throw new Error("Missing tenantId claim");
  }

  const sub = String(payload.sub ?? "").trim();
  if (!sub) {
    throw new Error("Missing subject claim");
  }

  return {
    sub,
    email: payload.email ? String(payload.email) : undefined,
    role,
    // Candidates are intentionally isolated from recruiter tenant management.
    tenantId: tenantId || "public",
    groups,
    tokenUse: String(tokenUse),
  };
}

export function authorizeRole(auth: AuthContext, allowedRoles: AppRole[]): void {
  if (!allowedRoles.includes(auth.role)) {
    throw new Error("Forbidden");
  }
}
