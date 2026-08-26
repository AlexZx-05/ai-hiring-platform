import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
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
  "INTERVIEW_RECOMMENDED",
  "INTERVIEW_SCHEDULED",
  "OFFER",
  "HIRED",
  "REJECTED",
]);
const validTransitions: Partial<Record<ApplicationStatus, ApplicationStatus[]>> = {
  PARSING: ["AI_REVIEWED", "REJECTED"],
  AI_REVIEWED: ["UNDER_REVIEW", "SHORTLISTED", "REJECTED"],
  UNDER_REVIEW: ["SHORTLISTED", "INTERVIEW_RECOMMENDED", "REJECTED"],
  SHORTLISTED: ["INTERVIEW_RECOMMENDED", "REJECTED"],
  INTERVIEW_RECOMMENDED: ["INTERVIEW_SCHEDULED", "REJECTED"],
  INTERVIEW_SCHEDULED: ["OFFER", "REJECTED"],
  OFFER: ["HIRED", "REJECTED"],
};
const REGION = process.env.AWS_REGION ?? "ap-south-1";
const RESUME_BUCKET_NAME = process.env.RESUME_BUCKET_NAME;
const NOTIFICATION_WEBHOOK_URL = process.env.NOTIFICATION_WEBHOOK_URL;
const RESUME_DOWNLOAD_EXPIRY_SECONDS = 300;

const s3 = new S3Client({ region: REGION });

function tenantJobsPk(tenantId: string): string {
  return `TENANT#${tenantId}#JOBS`;
}

function candidatePk(tenantId: string, candidateId: string): string {
  return `TENANT#${tenantId}#CANDIDATE#${candidateId}`;
}

function applicationSk(applicationId: string): string {
  return `APPLICATION#${applicationId}`;
}

function parseStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }

  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

function normalizeAnalysisRecord(analysis: Record<string, unknown>) {
  return {
    atsScore:
      typeof analysis.atsScore === "number"
        ? analysis.atsScore
        : Number(analysis.atsScore ?? 0),
    matchedSkills: parseStringList(analysis.matchedSkills),
    missingSkills: parseStringList(analysis.missingSkills),
    analysisSummary:
      typeof analysis.summary === "string" ? analysis.summary : undefined,
    analysisConfidence:
      typeof analysis.confidence === "number"
        ? analysis.confidence
        : Number(analysis.confidence ?? 0),
  };
}

async function sendApplicationNotification(application: Record<string, unknown>) {
  if (!NOTIFICATION_WEBHOOK_URL) {
    return;
  }

  const status = String(application.status ?? "");
  if (status !== "SHORTLISTED" && status !== "REJECTED") {
    return;
  }

  try {
    await fetch(NOTIFICATION_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "APPLICATION_STATUS_CHANGED",
        status,
        tenantId: application.tenantId,
        applicationId: application.applicationId,
        candidateId: application.candidateId,
        candidateEmail: application.candidateEmail,
        jobId: application.jobId,
        recruiterNote: application.recruiterNote,
        updatedAt: application.updatedAt,
      }),
    });
  } catch (error) {
    console.warn("Application notification failed", error);
  }
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
      const applicationId = String(application.applicationId ?? "");
      if (!applicationId) {
        return application;
      }

      const analysis = await dynamo.send(
        new QueryCommand({
          TableName: tableName,
          KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
          ExpressionAttributeValues: {
            ":pk": `APPLICATION#${applicationId}`,
            ":sk": `JOB#${jobId}#ANALYSIS#`,
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
        ...normalizeAnalysisRecord(latestAnalysis),
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
  const current = await dynamo.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: "GSI2",
      KeyConditionExpression: "GSI2PK = :pk",
      ExpressionAttributeValues: { ":pk": `APPLICATION#${applicationId}` },
      Limit: 1,
    })
  );
  const currentItem = current.Items?.[0];
  if (
    !currentItem ||
    currentItem.entityType !== "APPLICATION" ||
    currentItem.candidateId !== candidateId ||
    currentItem.jobTenantId !== auth.tenantId
  ) {
    return json(404, { message: "Application not found" });
  }
  const currentStatus = currentItem.status as ApplicationStatus;
  if (!validTransitions[currentStatus]?.includes(status)) {
    return json(409, { message: `Cannot move an application from ${currentStatus} to ${status}` });
  }
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
        PK: currentItem.PK,
        SK: currentItem.SK,
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

  if (response.Attributes) {
    await dynamo.send(new PutCommand({
      TableName: tableName,
      Item: {
        PK: currentItem.PK,
        SK: `APPLICATION#${applicationId}#AUDIT#${now}`,
        entityType: "APPLICATION_AUDIT",
        applicationId,
        candidateId,
        tenantId: auth.tenantId,
        fromStatus: currentStatus,
        toStatus: status,
        recruiterNote: recruiterNote ?? undefined,
        decidedBy: auth.sub,
        createdAt: now,
      },
    }));
    await sendApplicationNotification(response.Attributes);
  }

  return json(200, { application: response.Attributes });
}

async function createResumeDownloadUrl(
  event: APIGatewayProxyEventV2,
  auth: AuthContext
): Promise<APIGatewayProxyStructuredResultV2> {
  if (!RESUME_BUCKET_NAME) {
    return json(500, { message: "RESUME_BUCKET_NAME is not configured" });
  }

  const candidateId =
    getPathParam(event, "candidateId") ??
    event.queryStringParameters?.candidateId?.trim();
  const applicationId =
    getPathParam(event, "applicationId") ??
    event.queryStringParameters?.applicationId?.trim();

  if (!candidateId || !applicationId) {
    return json(400, { message: "candidateId and applicationId are required" });
  }

  const tableName = requireTableName();
  const application = await dynamo.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: "GSI2",
      KeyConditionExpression: "GSI2PK = :pk",
      ExpressionAttributeValues: {
        ":pk": `APPLICATION#${applicationId}`,
      },
      Limit: 1,
    })
  );

  const applicationItem = application.Items?.[0];
  if (
    !applicationItem ||
    applicationItem.entityType !== "APPLICATION" ||
    applicationItem.candidateId !== candidateId ||
    applicationItem.jobTenantId !== auth.tenantId
  ) {
    return json(404, { message: "Application not found" });
  }

  const resumeObjectKey = String(applicationItem.resumeObjectKey ?? "").trim();
  if (!resumeObjectKey) {
    return json(404, { message: "Resume object is not available for this application" });
  }

  const downloadUrl = await getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: RESUME_BUCKET_NAME,
      Key: resumeObjectKey,
      ResponseContentDisposition: `inline; filename="${applicationItem.resumeId ?? "resume"}.pdf"`,
    }),
    { expiresIn: RESUME_DOWNLOAD_EXPIRY_SECONDS }
  );

  return json(200, {
    applicationId,
    candidateId,
    resumeId: applicationItem.resumeId,
    downloadUrl,
    expiresIn: RESUME_DOWNLOAD_EXPIRY_SECONDS,
  });
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
  if (method === "GET" && route.includes("/resume-url")) {
    return createResumeDownloadUrl(event, auth);
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
