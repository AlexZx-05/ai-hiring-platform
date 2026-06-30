import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { GetCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { dynamo, requireTableName } from "../../shared/dynamodb.js";
import { getHttpMethod, getPathParam, getRawPath, json, parseJsonBody } from "../../shared/http.js";
import { withAuth } from "../../shared/middlewares/with-auth.js";
import type { AuthContext } from "../../shared/types/auth.js";
import type { ApplicationStatus } from "../../shared/types/jobs.js";

type UpdateApplicationStatusRequest = {
  candidateId?: string;
  applicationId?: string;
  status?: ApplicationStatus;
  recruiterNote?: string;
};

const allowedReviewStatuses = new Set<ApplicationStatus>([
  "UNDER_REVIEW",
  "SHORTLISTED",
  "REJECTED",
]);

function tenantJobsPk(tenantId: string): string {
  return `TENANT#${tenantId}#JOBS`;
}

function candidatePk(tenantId: string, candidateId: string): string {
  return `TENANT#${tenantId}#CANDIDATE#${candidateId}`;
}

function applicationSk(applicationId: string): string {
  return `APPLICATION#${applicationId}`;
}

async function listRecruiterJobs(
  auth: AuthContext
): Promise<APIGatewayProxyStructuredResultV2> {
  const tableName = requireTableName();
  const response = await dynamo.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :pk",
      ExpressionAttributeValues: {
        ":pk": tenantJobsPk(auth.tenantId),
      },
      ScanIndexForward: false,
      Limit: 100,
    })
  );

  return json(200, { jobs: response.Items ?? [] });
}

async function listJobApplications(
  event: APIGatewayProxyEventV2,
  auth: AuthContext
): Promise<APIGatewayProxyStructuredResultV2> {
  const jobId = getPathParam(event, "jobId") ?? getPathParam(event, "id");
  if (!jobId) {
    return json(400, { message: "jobId is required" });
  }

  const tableName = requireTableName();
  const response = await dynamo.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :pk",
      ExpressionAttributeValues: {
        ":pk": `TENANT#${auth.tenantId}#JOB#${jobId}`,
      },
      ScanIndexForward: false,
      Limit: 100,
    })
  );

  const applications = await Promise.all(
    (response.Items ?? []).map(async (application) => {
      const candidateId = String(application.candidateId ?? "");
      const resumeId = String(application.resumeId ?? "");
      if (!candidateId || !resumeId) {
        return application;
      }

      const analysis = await dynamo.send(
        new QueryCommand({
          TableName: tableName,
          KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
          ExpressionAttributeValues: {
            ":pk": candidatePk(auth.tenantId, candidateId),
            ":sk": `ANALYSIS#${resumeId}`,
          },
          ScanIndexForward: false,
          Limit: 1,
        })
      );

      const latestAnalysis = analysis.Items?.[0];
      if (!latestAnalysis) {
        return application;
      }

      return {
        ...application,
        atsScore: latestAnalysis.atsScore,
        matchedSkills: latestAnalysis.matchedSkills,
        missingSkills: latestAnalysis.missingSkills,
        analysisSummary: latestAnalysis.summary,
        analysisConfidence: latestAnalysis.confidence,
      };
    })
  );

  return json(200, { applications });
}

async function updateApplicationStatus(
  event: APIGatewayProxyEventV2,
  auth: AuthContext
): Promise<APIGatewayProxyStructuredResultV2> {
  let payload: UpdateApplicationStatusRequest;
  try {
    payload = parseJsonBody<UpdateApplicationStatusRequest>(event);
  } catch (error) {
    return json(400, { message: error instanceof Error ? error.message : "Invalid request" });
  }

  const candidateId = payload.candidateId?.trim() ?? "";
  const applicationId =
    payload.applicationId?.trim() ??
    getPathParam(event, "applicationId") ??
    "";
  const status = payload.status;

  if (!candidateId || !applicationId || !status || !allowedReviewStatuses.has(status)) {
    return json(400, {
      message:
        "candidateId, applicationId, and valid status are required. Valid statuses: UNDER_REVIEW, SHORTLISTED, REJECTED",
    });
  }

  const tableName = requireTableName();
  const now = new Date().toISOString();
  const expressionAttributeValues: Record<string, string> = {
    ":status": status,
    ":updatedAt": now,
    ":reviewedBy": auth.sub,
  };
  let updateExpression =
    "SET #status = :status, updatedAt = :updatedAt, reviewedBy = :reviewedBy";

  const recruiterNote = payload.recruiterNote?.trim();
  if (recruiterNote) {
    expressionAttributeValues[":recruiterNote"] = recruiterNote;
    updateExpression += ", recruiterNote = :recruiterNote";
  }

  const response = await dynamo.send(
    new UpdateCommand({
      TableName: tableName,
      Key: {
        PK: candidatePk(auth.tenantId, candidateId),
        SK: applicationSk(applicationId),
      },
      UpdateExpression: updateExpression,
      ConditionExpression: "attribute_exists(PK) AND attribute_exists(SK)",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "ALL_NEW",
    })
  );

  return json(200, { application: response.Attributes });
}

async function getCandidateProfile(
  event: APIGatewayProxyEventV2,
  auth: AuthContext
): Promise<APIGatewayProxyStructuredResultV2> {
  const candidateId =
    getPathParam(event, "candidateId") ??
    event.queryStringParameters?.candidateId?.trim();
  if (!candidateId) {
    return json(400, { message: "candidateId is required" });
  }

  const tableName = requireTableName();
  const response = await dynamo.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: {
        ":pk": candidatePk(auth.tenantId, candidateId),
      },
      ScanIndexForward: false,
      Limit: 100,
    })
  );

  return json(200, {
    candidateId,
    records: response.Items ?? [],
  });
}

async function handler(
  event: APIGatewayProxyEventV2,
  auth: AuthContext
): Promise<APIGatewayProxyStructuredResultV2> {
  const method = getHttpMethod(event);
  const route = getRawPath(event).toLowerCase();

  if (method === "OPTIONS") {
    return json(200, { ok: true });
  }
  if (method === "GET" && route.includes("/applications")) {
    return listJobApplications(event, auth);
  }
  if (method === "GET" && route.includes("/candidates")) {
    return getCandidateProfile(event, auth);
  }
  if ((method === "PATCH" || method === "POST") && route.includes("/status")) {
    return updateApplicationStatus(event, auth);
  }

  return listRecruiterJobs(auth);
}

export const main = withAuth(handler, ["recruiter", "admin"]);
