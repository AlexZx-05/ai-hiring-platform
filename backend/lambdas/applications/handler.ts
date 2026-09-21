import { randomUUID } from "node:crypto";
import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import { GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import { dynamo, requireTableName } from "../../shared/dynamodb.js";
import { getHttpMethod, json, parseJsonBody } from "../../shared/http.js";
import { withAuth } from "../../shared/middlewares/with-auth.js";
import type { AuthContext } from "../../shared/types/auth.js";
import type {
  ApplicationRecord,
  ApplicationScreeningAnswer,
  ScreeningQuestion,
} from "../../shared/types/jobs.js";

const REGION = process.env.AWS_REGION ?? "ap-south-1";
const RESUME_BUCKET_NAME = process.env.RESUME_BUCKET_NAME;
const APPLICATION_ANALYSIS_FUNCTION_NAME = process.env.APPLICATION_ANALYSIS_FUNCTION_NAME;
const s3 = new S3Client({ region: REGION });
const lambda = new LambdaClient({ region: REGION });

type CreateApplicationRequest = {
  jobId?: string;
  publicTenantSlug?: string;
  publicSlug?: string;
  resumeId?: string;
  resumeObjectKey?: string;
  coverNote?: string;
  screeningAnswers?: Array<{
    questionId?: string;
    answer?: string;
  }>;
};

function candidatePk(tenantId: string, candidateId: string): string {
  return `TENANT#${tenantId}#CANDIDATE#${candidateId}`;
}

function validateApplication(payload: CreateApplicationRequest): Required<
  Pick<CreateApplicationRequest, "jobId" | "publicTenantSlug" | "publicSlug" | "resumeId" | "resumeObjectKey">
> & Pick<CreateApplicationRequest, "coverNote"> {
  const jobId = payload.jobId?.trim() ?? "";
  const resumeId = payload.resumeId?.trim() ?? "";
  const resumeObjectKey = payload.resumeObjectKey?.trim() ?? "";
  const publicTenantSlug = payload.publicTenantSlug?.trim().toLowerCase() ?? "";
  const publicSlug = payload.publicSlug?.trim().toLowerCase() ?? "";

  if (!jobId || !publicTenantSlug || !publicSlug || !resumeId || !resumeObjectKey) {
    throw new Error("jobId, publicTenantSlug, publicSlug, resumeId, and resumeObjectKey are required");
  }

  return {
    jobId,
    publicTenantSlug,
    publicSlug,
    resumeId,
    resumeObjectKey,
    coverNote: payload.coverNote?.trim() || undefined,
  };
}

function validateScreeningAnswers(
  value: unknown,
  questions: ScreeningQuestion[]
): ApplicationScreeningAnswer[] {
  if (!Array.isArray(value) && value !== undefined) {
    throw new Error("screeningAnswers must be a list");
  }

  const answersByQuestionId = new Map<string, string>();
  for (const item of value ?? []) {
    if (!item || typeof item !== "object") {
      throw new Error("A screening answer is invalid");
    }
    const input = item as Record<string, unknown>;
    const questionId = String(input.questionId ?? "").trim();
    const answer = String(input.answer ?? "").trim();
    if (!questionId || answersByQuestionId.has(questionId)) {
      throw new Error("Each screening question can be answered only once");
    }
    if (answer.length > 2_000) {
      throw new Error("A screening answer cannot exceed 2,000 characters");
    }
    answersByQuestionId.set(questionId, answer);
  }

  const questionIds = new Set(questions.map((question) => question.id));
  for (const questionId of answersByQuestionId.keys()) {
    if (!questionIds.has(questionId)) {
      throw new Error("An answer does not belong to this job's screening questions");
    }
  }

  return questions.flatMap((question) => {
    const answer = answersByQuestionId.get(question.id)?.trim() ?? "";
    if (question.required && !answer) {
      throw new Error(`Please answer: ${question.prompt}`);
    }
    if (!answer) {
      return [];
    }
    if (question.type === "YES_NO" && !["yes", "no"].includes(answer.toLowerCase())) {
      throw new Error(`Please answer Yes or No: ${question.prompt}`);
    }
    if (
      question.type === "SELECT" &&
      !question.options?.some((option) => option.toLowerCase() === answer.toLowerCase())
    ) {
      throw new Error(`Please choose one of the listed options: ${question.prompt}`);
    }
    return [{ questionId: question.id, prompt: question.prompt, answer }];
  });
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
  if (!RESUME_BUCKET_NAME) {
    return json(500, { message: "RESUME_BUCKET_NAME is not configured" });
  }
  const job = await dynamo.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: "GSI3",
      KeyConditionExpression: "GSI3PK = :pk AND GSI3SK = :sk",
      ExpressionAttributeValues: {
        ":pk": `PUBLIC#${payload.publicTenantSlug}`,
        ":sk": `SLUG#${payload.publicSlug}`,
      },
      Limit: 1,
    })
  );

  const jobItem = job.Items?.[0];
  if (!jobItem || jobItem.entityType !== "JOB" || jobItem.status !== "OPEN" || jobItem.jobId !== payload.jobId) {
    return json(404, { message: "Open job not found" });
  }

  let screeningAnswers: ApplicationScreeningAnswer[];
  try {
    screeningAnswers = validateScreeningAnswers(
      parseJsonBody<CreateApplicationRequest>(event).screeningAnswers,
      Array.isArray(jobItem.screeningQuestions) ? jobItem.screeningQuestions as ScreeningQuestion[] : []
    );
  } catch (error) {
    return json(400, {
      message: error instanceof Error ? error.message : "Invalid screening answers",
    });
  }

  const expectedPrefix = `tenant/${auth.tenantId}/candidate/${auth.sub}/resume/${payload.resumeId}-`;
  if (!payload.resumeObjectKey.startsWith(expectedPrefix)) {
    return json(403, { message: "The selected resume does not belong to this candidate" });
  }

  try {
    const object = await s3.send(new HeadObjectCommand({
      Bucket: RESUME_BUCKET_NAME,
      Key: payload.resumeObjectKey,
    }));
    const metadata = object.Metadata ?? {};
    if (
      metadata.tenantid !== auth.tenantId ||
      metadata.candidateid !== auth.sub ||
      metadata.resumeid !== payload.resumeId
    ) {
      return json(403, { message: "Resume ownership verification failed" });
    }
  } catch {
    return json(409, { message: "Resume upload has not completed or is unavailable" });
  }

  const existing = await dynamo.send(new QueryCommand({
    TableName: tableName,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
    FilterExpression: "jobId = :jobId",
    ExpressionAttributeValues: {
      ":pk": candidatePk(auth.tenantId, auth.sub),
      ":sk": "APPLICATION#",
      ":jobId": payload.jobId,
    },
    Limit: 1,
  }));
  if (existing.Items?.length) {
    return json(409, { message: "You have already applied to this job" });
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
    screeningAnswers,
    status: "PARSING",
    createdAt: now,
    updatedAt: now,
    jobTenantId: jobItem.tenantId,
    GSI1PK: `TENANT#${jobItem.tenantId}#JOB#${payload.jobId}`,
    GSI1SK: `STATUS#PARSING#CREATED#${now}#CANDIDATE#${auth.sub}`,
    GSI2PK: `APPLICATION#${applicationId}`,
    GSI2SK: `CANDIDATE#${auth.sub}`,
    GSI3PK: `RESUME#${payload.resumeId}`,
    GSI3SK: `APPLICATION#${applicationId}`,
  };

  await dynamo.send(
    new PutCommand({
      TableName: tableName,
      Item: item,
      ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
    })
  );

  const parseStatus = await dynamo.send(new QueryCommand({
    TableName: tableName,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
    ExpressionAttributeValues: { ":pk": item.PK, ":sk": `RESUME#${payload.resumeId}#STATUS#` },
    ScanIndexForward: false,
    Limit: 1,
  }));
  if (parseStatus.Items?.[0]?.status === "SUCCEEDED" && APPLICATION_ANALYSIS_FUNCTION_NAME) {
    await lambda.send(new InvokeCommand({
      FunctionName: APPLICATION_ANALYSIS_FUNCTION_NAME,
      InvocationType: "Event",
      Payload: new TextEncoder().encode(JSON.stringify({ applicationId })),
    }));
  }

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

  const applications = await Promise.all((response.Items ?? []).map(async (application) => {
    if (application.status !== "PARSING") return application;
    const parse = await dynamo.send(new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: { ":pk": application.PK, ":sk": `RESUME#${application.resumeId}#STATUS#` },
      ScanIndexForward: false,
      Limit: 1,
    }));
    const latest = parse.Items?.[0];
    return latest?.status === "FAILED"
      ? { ...application, processingError: String(latest.details ?? "Resume parsing failed. Please upload a clean PDF and apply again.") }
      : application;
  }));
  return json(200, { applications });
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
