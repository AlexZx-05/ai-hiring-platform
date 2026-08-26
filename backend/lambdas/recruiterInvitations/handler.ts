import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { randomUUID } from "node:crypto";
import { AdminAddUserToGroupCommand, AdminCreateUserCommand, CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { dynamo, requireTableName } from "../../shared/dynamodb.js";
import { getHttpMethod, json, parseJsonBody } from "../../shared/http.js";
import { withAuth } from "../../shared/middlewares/with-auth.js";
import type { AuthContext } from "../../shared/types/auth.js";

const userPoolId = process.env.COGNITO_USER_POOL_ID;
const cognito = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION ?? "ap-south-1" });

type InviteRequest = { email?: string; tenantId?: string };

async function createInvitation(event: APIGatewayProxyEventV2, auth: AuthContext): Promise<APIGatewayProxyStructuredResultV2> {
  if (!userPoolId) return json(500, { message: "COGNITO_USER_POOL_ID is not configured" });
  let request: InviteRequest;
  try { request = parseJsonBody<InviteRequest>(event); } catch { return json(400, { message: "Invalid request" }); }
  const email = request.email?.trim().toLowerCase() ?? "";
  const tenantId = request.tenantId?.trim() ?? auth.tenantId;
  if (!/^\S+@\S+\.\S+$/.test(email) || !tenantId) return json(400, { message: "A valid email and tenantId are required" });
  if (tenantId !== auth.tenantId && auth.role !== "admin") return json(403, { message: "You can only invite recruiters to your own tenant" });

  const invitationId = randomUUID();
  try {
    await cognito.send(new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: email,
      DesiredDeliveryMediums: ["EMAIL"],
      UserAttributes: [
        { Name: "email", Value: email },
        { Name: "email_verified", Value: "true" },
        { Name: "custom:tenantId", Value: tenantId },
      ],
    }));
    await cognito.send(new AdminAddUserToGroupCommand({ UserPoolId: userPoolId, Username: email, GroupName: "recruiter" }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create recruiter invitation";
    return json(message.includes("UsernameExistsException") ? 409 : 502, { message });
  }

  const createdAt = new Date().toISOString();
  await dynamo.send(new PutCommand({
    TableName: requireTableName(),
    Item: { PK: `TENANT#${tenantId}#INVITATION#${invitationId}`, SK: "PROFILE", entityType: "RECRUITER_INVITATION", invitationId, email, tenantId, role: "recruiter", status: "SENT", invitedBy: auth.sub, createdAt },
  }));
  return json(201, { invitation: { invitationId, email, tenantId, role: "recruiter", status: "SENT", createdAt } });
}

async function handler(event: APIGatewayProxyEventV2, auth: AuthContext): Promise<APIGatewayProxyStructuredResultV2> {
  if (getHttpMethod(event) === "OPTIONS") return json(200, { ok: true });
  if (getHttpMethod(event) !== "POST") return json(405, { message: "Method not allowed" });
  return createInvitation(event, auth);
}

export const main = withAuth(handler, ["admin"]);
