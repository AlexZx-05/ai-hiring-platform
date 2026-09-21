import { randomUUID } from "node:crypto";
import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { GetCommand, QueryCommand, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { dynamo, requireTableName } from "../../shared/dynamodb.js";
import { getHttpMethod, getPathParam, json, parseJsonBody } from "../../shared/http.js";
import { withAuth } from "../../shared/middlewares/with-auth.js";
import type { AuthContext } from "../../shared/types/auth.js";
import type {
  JobRecord,
  ScreeningQuestion,
  ScreeningQuestionType,
} from "../../shared/types/jobs.js";

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
  screeningQuestions?: Array<{
    prompt?: string;
    required?: boolean;
    type?: ScreeningQuestionType;
    options?: string[];
  }>;
  status?: JobRecord["status"];
};

function tenantJobsPk(tenantId: string): string {
  return `TENANT#${tenantId}#JOBS`;
}

function jobPk(tenantId: string, jobId: string): string {
  return `TENANT#${tenantId}#JOB#${jobId}`;
}

function publicJobsPk(): string {
  return "PUBLIC#JOBS";
}

function publicJobSk(jobId: string): string {
  return `JOB#${jobId}`;
}

function publicOpenJobsGsiPk(): string {
  return "PUBLIC#OPEN_JOBS";
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

function cleanScreeningQuestions(value: unknown): ScreeningQuestion[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new Error("screeningQuestions must be a list");
  }
  if (value.length > 8) {
    throw new Error("A job can have at most 8 screening questions");
  }

  return value.map((question, index) => {
    if (!question || typeof question !== "object") {
      throw new Error(`Screening question ${index + 1} is invalid`);
    }

    const input = question as Record<string, unknown>;
    const prompt = String(input.prompt ?? "").trim();
    const type = input.type ?? "TEXT";
    if (!prompt || prompt.length > 300) {
      throw new Error(`Screening question ${index + 1} must be between 1 and 300 characters`);
    }
    if (type !== "TEXT" && type !== "YES_NO" && type !== "SELECT") {
      throw new Error(`Screening question ${index + 1} has an unsupported type`);
    }

    const options = cleanList(input.options).map((option) => option.slice(0, 100));
    const uniqueOptions = [...new Set(options.map((option) => option.toLowerCase()))];
    if (type === "SELECT" && uniqueOptions.length < 2) {
      throw new Error(`Screening question ${index + 1} needs at least two answer options`);
    }

    return {
      id: randomUUID(),
      prompt,
      required: input.required !== false,
      type,
      ...(type === "SELECT" ? { options: options.slice(0, 8) } : {}),
    };
  });
}

function slugify(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 64) || "job";
}

function validateJob(payload: CreateJobRequest): Omit<
  JobRecord,
  "PK" | "SK" | "entityType" | "tenantId" | "jobId" | "postedBy" | "createdAt" | "updatedAt" | "GSI1PK" | "GSI1SK" | "GSI2PK" | "GSI2SK" | "GSI3PK" | "GSI3SK" | "publicTenantSlug" | "publicSlug"
> {
  const title = payload.title?.trim() ?? "";
  const department = payload.department?.trim() ?? "";
  const location = payload.location?.trim() ?? "";
  const description = payload.description?.trim() ?? "";
  const requirements = cleanList(payload.requirements);
  const skills = cleanList(payload.skills);
  const screeningQuestions = cleanScreeningQuestions(payload.screeningQuestions);

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
    screeningQuestions,
    status: payload.status ?? "OPEN",
  };
}

async function listJobs(auth: AuthContext): Promise<APIGatewayProxyStructuredResultV2> {
  const tableName = requireTableName();
  if (auth.role === "candidate") {
    const response = await dynamo.send(
      new QueryCommand({
        TableName: tableName,
        IndexName: "GSI1",
        KeyConditionExpression: "GSI1PK = :pk",
        ExpressionAttributeValues: {
          ":pk": publicOpenJobsGsiPk(),
        },
        ScanIndexForward: false,
        Limit: 50,
      })
    );

    return json(200, { jobs: response.Items ?? [] });
  }

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
  if (auth.role === "candidate") {
    const response = await dynamo.send(
      new GetCommand({
        TableName: tableName,
        Key: {
          PK: publicJobsPk(),
          SK: publicJobSk(jobId),
        },
      })
    );

    if (!response.Item || response.Item.entityType !== "PUBLIC_JOB" || response.Item.status !== "OPEN") {
      return json(404, { message: "Open job not found" });
    }

    return json(200, { job: response.Item });
  }

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
  const publicTenantSlug = slugify(auth.tenantId);
  const publicSlug = `${slugify(validJob.title)}-${jobId.slice(0, 6)}`;
  const item: JobRecord = {
    PK: jobPk(auth.tenantId, jobId),
    SK: "PROFILE",
    entityType: "JOB",
    tenantId: auth.tenantId,
    jobId,
    ...validJob,
    publicTenantSlug,
    publicSlug,
    postedBy: auth.sub,
    createdAt: now,
    updatedAt: now,
    GSI1PK: tenantJobsPk(auth.tenantId),
    GSI1SK: `STATUS#${validJob.status}#CREATED#${now}#JOB#${jobId}`,
    GSI2PK: `TENANT#${auth.tenantId}#JOB_DEPARTMENT#${validJob.department.toLowerCase()}`,
    GSI2SK: `CREATED#${now}#JOB#${jobId}`,
    GSI3PK: `PUBLIC#${publicTenantSlug}`,
    GSI3SK: `SLUG#${publicSlug}`,
  };

  const publicJobItem = {
    PK: publicJobsPk(),
    SK: publicJobSk(jobId),
    entityType: "PUBLIC_JOB",
    tenantId: auth.tenantId,
    jobId,
    ...validJob,
    publicTenantSlug,
    publicSlug,
    createdAt: now,
    GSI1PK: validJob.status === "OPEN" ? publicOpenJobsGsiPk() : "PUBLIC#DRAFT_JOBS",
    GSI1SK: `CREATED#${now}#JOB#${jobId}`,
  };

  await dynamo.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: tableName,
            Item: item,
            ConditionExpression: "attribute_not_exists(PK)",
          },
        },
        {
          Put: {
            TableName: tableName,
            Item: publicJobItem,
            ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
          },
        },
      ],
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
