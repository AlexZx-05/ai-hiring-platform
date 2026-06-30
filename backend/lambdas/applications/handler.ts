import { randomUUID } from "node:crypto";
import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { dynamo, requireTableName } from "../../shared/dynamodb.js";
import { getHttpMethod, json, parseJsonBody } from "../../shared/http.js";
import { withAuth } from "../../shared/middlewares/with-auth.js";
import type { AuthContext } from "../../shared/types/auth.js";
import type { ApplicationRecord } from "../../shared/types/jobs.js";

type CreateApplicationRequest = {
  jobId?: string;
  resumeId?: string;
  resumeObjectKey?: string;
  coverNote?: string;
};

function candidatePk(tenantId: string, candidateId: string): string {
  return `TENANT#${tenantId}#CANDIDATE#${candidateId}`;
}

function jobPk(tenantId: string, jobId: string): string {
  return `TENANT#${tenantId}#JOB#${jobId}`;
}

function validateApplication(payload: CreateApplicationRequest): Required<
  Pick<CreateApplicationRequest, "jobId" | "resumeId" | "resumeObjectKey">
> & Pick<CreateApplicationRequest, "coverNote"> {
  const jobId = payload.jobId?.trim() ?? "";
  const resumeId = payload.resumeId?.trim() ?? "";
  const resumeObjectKey = payload.resumeObjectKey?.trim() ?? "";

  if (!jobId || !resumeId || !resumeObjectKey) {
    throw new Error("jobId, resumeId, and resumeObjectKey are required");
  }

  return {
    jobId,
    resumeId,
    resumeObjectKey,
    coverNote: payload.coverNote?.trim() || undefined,
  };
}

async function createApplication(
  event: APIGatewayProxyEventV2,
  auth: AuthContext
): Promise<APIGatewayProxyStructuredResultV2> {
  let payload: ReturnType<typeof validateApplication>;
  try {
    payload = validateApplication(parseJsonBody<CreateApplicationRequest>(event));
  } catch (error) {
    return json(400, { message: error instanceof Error ? error.message : "Invalid application" });
  }

  const tableName = requireTableName();
  const job = await dynamo.send(
    new GetCommand({
      TableName: tableName,
      Key: {
        PK: jobPk(auth.tenantId, payload.jobId),
        SK: "PROFILE",
      },
    })
  );

  if (!job.Item || job.Item.status !== "OPEN") {
    return json(404, { message: "Open job not found" });
  }

  const applicationId = randomUUID();
  const now = new Date().toISOString();
  const item: ApplicationRecord = {
    PK: candidatePk(auth.tenantId, auth.sub),
    SK: `APPLICATION#${applicationId}`,
    entityType: "APPLICATION",
    tenantId: auth.tenantId,
    applicationId,
    jobId: payload.jobId,
    candidateId: auth.sub,
    candidateEmail: auth.email,
    resumeId: payload.resumeId,
    resumeObjectKey: payload.resumeObjectKey,
    coverNote: payload.coverNote,
    status: "SUBMITTED",
    createdAt: now,
    updatedAt: now,
    GSI1PK: `TENANT#${auth.tenantId}#JOB#${payload.jobId}`,
    GSI1SK: `STATUS#SUBMITTED#CREATED#${now}#CANDIDATE#${auth.sub}`,
    GSI2PK: `TENANT#${auth.tenantId}#APPLICATIONS`,
    GSI2SK: `CREATED#${now}#APPLICATION#${applicationId}`,
  };

  await dynamo.send(
    new PutCommand({
      TableName: tableName,
      Item: item,
      ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
    })
  );

  return json(201, { application: item });
}

async function listCandidateApplications(
  auth: AuthContext
): Promise<APIGatewayProxyStructuredResultV2> {
  const tableName = requireTableName();
  const response = await dynamo.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": candidatePk(auth.tenantId, auth.sub),
        ":sk": "APPLICATION#",
      },
      ScanIndexForward: false,
      Limit: 50,
    })
  );

  return json(200, { applications: response.Items ?? [] });
}

async function handler(
  event: APIGatewayProxyEventV2,
  auth: AuthContext
): Promise<APIGatewayProxyStructuredResultV2> {
  const method = getHttpMethod(event);

  if (method === "OPTIONS") {
    return json(200, { ok: true });
  }
  if (method === "POST") {
    return createApplication(event, auth);
  }

  return listCandidateApplications(auth);
}

export const main = withAuth(handler, ["candidate", "admin"]);
