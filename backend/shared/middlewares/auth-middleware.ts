import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { createRemoteJWKSet, jwtVerify } from "jose";
import {
  AdminGetUserCommand,
  AdminListGroupsForUserCommand,
  CognitoIdentityProviderClient,
  GetUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import type { AppRole, AuthContext } from "../types/auth.js";

const REGION = process.env.COGNITO_REGION ?? "ap-south-1";
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const CLIENT_ID = process.env.COGNITO_CLIENT_ID;

const issuer =
  `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`;

const jwks = createRemoteJWKSet(
  new URL(`${issuer}/.well-known/jwks.json`)
);

const cognito = new CognitoIdentityProviderClient({
  region: REGION,
});

function parseBearerToken(
  event: APIGatewayProxyEventV2
): string | null {
  const header =
    event.headers?.authorization ??
    event.headers?.Authorization ??
    "";

  if (!header.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return header.slice(7).trim();
}

function resolveRole(
  groups: string[]
): AppRole {
  if (groups.includes("admin")) {
    return "admin";
  }

  if (groups.includes("recruiter")) {
    return "recruiter";
  }

  return "candidate";
}

async function resolveIdentityTokenAttributes(
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const attributes: Record<string, unknown> = {
    "custom:tenantId": payload["custom:tenantId"],
    email: payload.email,
  };

  if (String(attributes["custom:tenantId"] ?? "").trim()) {
    return attributes;
  }

  /*
   * API Gateway authorizes ID tokens for REST methods without OAuth scopes.
   * Some existing Cognito sessions do not expose mutable custom attributes in
   * their ID-token payload. Once the signature has been verified, resolve the
   * canonical user attributes from Cognito instead of rejecting a valid user.
   */
  const username = String(
    payload["cognito:username"] ?? payload.email ?? ""
  ).trim();

  if (!username || !USER_POOL_ID) {
    return attributes;
  }

  const user = await cognito.send(
    new AdminGetUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
    })
  );

  return Object.fromEntries(
    user.UserAttributes?.map((attribute) => [
      attribute.Name,
      attribute.Value ?? "",
    ]) ?? []
  );
}

async function resolveAuthoritativeGroups(
  payload: Record<string, unknown>,
  tokenGroups: string[]
): Promise<string[]> {
  const username = String(
    payload["cognito:username"] ?? payload.username ?? payload.email ?? ""
  ).trim();

  if (!username || !USER_POOL_ID) {
    return tokenGroups;
  }

  const response = await cognito.send(
    new AdminListGroupsForUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
    })
  );

  return response.Groups?.flatMap((group) =>
    group.GroupName ? [group.GroupName] : []
  ) ?? [];
}

export async function verifyAccessToken(
  event: APIGatewayProxyEventV2
): Promise<AuthContext> {
  if (!USER_POOL_ID || !CLIENT_ID) {
    throw new Error("Cognito authentication is not configured");
  }

  const token = parseBearerToken(event);

  if (!token) {
    throw new Error("Missing bearer token");
  }

  /*
   * First verify the JWT cryptographically.
   */
  const { payload } = await jwtVerify(
    token,
    jwks,
    { issuer }
  );

  const tokenUse = String(payload.token_use ?? "");
  if (tokenUse !== "access" && tokenUse !== "id") {
    throw new Error("Invalid token_use");
  }

  const tokenClientId = tokenUse === "access"
    ? payload.client_id
    : payload.aud;
  if (tokenClientId !== CLIENT_ID) {
    throw new Error("Invalid token client");
  }

  const sub = String(payload.sub ?? "").trim();

  if (!sub) {
    throw new Error("Missing subject claim");
  }

  const tokenGroups = Array.isArray(payload["cognito:groups"])
    ? payload["cognito:groups"].filter(
        (group): group is string =>
          typeof group === "string"
      )
    : [];

  /*
   * Role membership is server-side authority. Query Cognito so a valid
   * session cannot be misclassified when a token was issued before a group
   * change or does not contain cognito:groups.
   */
  const groups = await resolveAuthoritativeGroups(payload, tokenGroups);
  const role = resolveRole(groups);

  // ID tokens are accepted by the API Gateway Cognito authorizer configured
  // for this REST API. Access tokens remain valid for direct/backend callers.
  const attributes: Record<string, unknown> = tokenUse === "access"
    ? Object.fromEntries(
        (await cognito.send(new GetUserCommand({ AccessToken: token })))
          .UserAttributes
          ?.map((attribute) => [attribute.Name, attribute.Value ?? ""]) ?? []
      )
    : await resolveIdentityTokenAttributes(payload);

  const claimedTenantId =
    String(attributes["custom:tenantId"] ?? "").trim();

  /*
   * Accounts created before the post-confirmation trigger did not receive a
   * tenant attribute. They remain safely isolated by a deterministic private
   * candidate tenant. Privileged roles must always have an explicit tenant
   * claim created through the invitation/admin workflow.
   */
  const tenantId = claimedTenantId ||
    (role === "candidate" ? `candidate-${sub}` : "");

  if (!tenantId) {
    throw new Error("Missing tenantId for privileged account");
  }

  return {
    sub,
    email: attributes.email
      ? String(attributes.email)
      : payload.email
        ? String(payload.email)
        : undefined,

    role,
    tenantId,
    groups,
    tokenUse,
  };
}

export function authorizeRole(
  auth: AuthContext,
  allowedRoles: AppRole[]
): void {
  if (!allowedRoles.includes(auth.role)) {
    throw new Error("Forbidden");
  }
}
