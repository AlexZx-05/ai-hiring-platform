import { randomUUID } from "node:crypto";
import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { dynamo, requireTableName } from "../../shared/dynamodb.js";
import { getHttpMethod, getPathParam, json, parseJsonBody } from "../../shared/http.js";
import { withAuth } from "../../shared/middlewares/with-auth.js";
import type { AuthContext } from "../../shared/types/auth.js";
import type { JobRecord } from "../../shared/types/jobs.js";

type CreateJobRequest = {
  title?: string;
  department?: string;
  location?: string;
  employmentType?: string;
  workMode?: JobRecord["workMode"];
  experienceLevel?: string;
  salaryRange?: string;
  description?: string;
  requirements?: string[];
  skills?: string[];
  status?: JobRecord["status"];
};

function tenantJobsPk(tenantId: string): string {
  return `TENANT#${tenantId}#JOBS`;
}

function jobPk(tenantId: string, jobId: string): string {
  return `TENANT#${tenantId}#JOB#${jobId}`;
}

function cleanList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item).trim())
    .filter(Boolean)
    .slice(0, 25);
}

function validateJob(payload: CreateJobRequest): Omit<
  JobRecord,
  "PK" | "SK" | "entityType" | "tenantId" | "jobId" | "postedBy" | "createdAt" | "updatedAt" | "GSI1PK" | "GSI1SK" | "GSI2PK" | "GSI2SK"
> {
  const title = payload.title?.trim() ?? "";
  const department = payload.department?.trim() ?? "";
  const location = payload.location?.trim() ?? "";
  const description = payload.description?.trim() ?? "";
  const requirements = cleanList(payload.requirements);
  const skills = cleanList(payload.skills);

  if (!title || !department || !location || !description) {
    throw new Error("title, department, location, and description are required");
  }
  if (!requirements.length || !skills.length) {
    throw new Error("At least one requirement and skill is required");
  }

  return {
    title,
    department,
    location,
    employmentType: payload.employmentType?.trim() || "Full-time",
    workMode: payload.workMode ?? "Hybrid",
    experienceLevel: payload.experienceLevel?.trim() || "Mid-level",
    salaryRange: payload.salaryRange?.trim() || undefined,
    description,
    requirements,
    skills,
    status: payload.status ?? "OPEN",
  };
}

async function listJobs(auth: AuthContext): Promise<APIGatewayProxyStructuredResultV2> {
  const tableName = requireTableName();
  const response = await dynamo.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :pk AND begins_with(GSI1SK, :open)",
      ExpressionAttributeValues: {
        ":pk": tenantJobsPk(auth.tenantId),
        ":open": "STATUS#OPEN#",
      },
      ScanIndexForward: false,
      Limit: 50,
    })
  );

  return json(200, { jobs: response.Items ?? [] });
}

async function getJob(
  event: APIGatewayProxyEventV2,
  auth: AuthContext
): Promise<APIGatewayProxyStructuredResultV2> {
  const jobId = getPathParam(event, "jobId") ?? getPathParam(event, "id");
  if (!jobId) {
    return json(400, { message: "jobId is required" });
  }

  const tableName = requireTableName();
  const response = await dynamo.send(
    new GetCommand({
      TableName: tableName,
      Key: {
        PK: jobPk(auth.tenantId, jobId),
        SK: "PROFILE",
      },
    })
  );

  if (!response.Item) {
    return json(404, { message: "Job not found" });
  }

  return json(200, { job: response.Item });
}

async function createJob(
  event: APIGatewayProxyEventV2,
  auth: AuthContext
): Promise<APIGatewayProxyStructuredResultV2> {
  if (auth.role !== "recruiter" && auth.role !== "admin") {
    return json(403, { message: "Only recruiters can create jobs" });
  }

  let validJob: ReturnType<typeof validateJob>;
  try {
    validJob = validateJob(parseJsonBody<CreateJobRequest>(event));
  } catch (error) {
    return json(400, { message: error instanceof Error ? error.message : "Invalid job" });
  }

  const tableName = requireTableName();
  const jobId = randomUUID();
  const now = new Date().toISOString();
  const item: JobRecord = {
    PK: jobPk(auth.tenantId, jobId),
    SK: "PROFILE",
    entityType: "JOB",
    tenantId: auth.tenantId,
    jobId,
    ...validJob,
    postedBy: auth.sub,
    createdAt: now,
    updatedAt: now,
    GSI1PK: tenantJobsPk(auth.tenantId),
    GSI1SK: `STATUS#${validJob.status}#CREATED#${now}#JOB#${jobId}`,
    GSI2PK: `TENANT#${auth.tenantId}#JOB_DEPARTMENT#${validJob.department.toLowerCase()}`,
    GSI2SK: `CREATED#${now}#JOB#${jobId}`,
  };

  await dynamo.send(
    new PutCommand({
      TableName: tableName,
      Item: item,
      ConditionExpression: "attribute_not_exists(PK)",
    })
  );

  return json(201, { job: item });
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
    return createJob(event, auth);
  }
  if (getPathParam(event, "jobId") || getPathParam(event, "id")) {
    return getJob(event, auth);
  }

  return listJobs(auth);
}

export const main = withAuth(handler, ["candidate", "recruiter", "admin"]);
