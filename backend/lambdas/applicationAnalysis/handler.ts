import type { Handler } from "aws-lambda";
import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { dynamo, requireTableName } from "../../shared/dynamodb.js";

const secrets = new SecretsManagerClient({ region: process.env.AWS_REGION ?? "ap-south-1" });
const secretArn = process.env.XAI_SECRET_ARN;
const apiUrl = process.env.XAI_API_URL ?? "https://api.x.ai/v1/chat/completions";
const model = process.env.XAI_MODEL_ID ?? "grok-3-mini";

type AnalysisEvent = { applicationId?: string };

async function apiKey(): Promise<string> {
  if (!secretArn) throw new Error("XAI_SECRET_ARN is not configured");
  const response = await secrets.send(new GetSecretValueCommand({ SecretId: secretArn }));
  const value = response.SecretString ?? "";
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return String(parsed.XAI_API_KEY ?? parsed.apiKey ?? "").trim();
  } catch {
    return value.trim();
  }
}

function parseJson(raw: string): Record<string, unknown> {
  const match = raw.replace(/```json|```/gi, "").match(/\{[\s\S]*\}/);
  return match ? JSON.parse(match[0]) as Record<string, unknown> : {};
}

export const main: Handler<AnalysisEvent> = async (event) => {
  const applicationId = String(event.applicationId ?? "").trim();
  if (!applicationId) throw new Error("applicationId is required");
  const TableName = requireTableName();

  const applicationQuery = await dynamo.send(new QueryCommand({
    TableName, IndexName: "GSI2", KeyConditionExpression: "GSI2PK = :pk",
    ExpressionAttributeValues: { ":pk": `APPLICATION#${applicationId}` }, Limit: 1,
  }));
  const application = applicationQuery.Items?.[0];
  if (!application || application.entityType !== "APPLICATION") throw new Error("Application not found");

  const [job, extraction] = await Promise.all([
    dynamo.send(new GetCommand({
      TableName,
      Key: { PK: `TENANT#${application.jobTenantId}#JOB#${application.jobId}`, SK: "PROFILE" },
    })),
    dynamo.send(new QueryCommand({
      TableName,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": application.PK,
        ":sk": `RESUME#${application.resumeId}#EXTRACTION#`,
      },
      ScanIndexForward: false,
      Limit: 1,
    })),
  ]);
  if (!job.Item || !extraction.Items?.[0]) throw new Error("Job or parsed resume is not available");

  const jobText = [job.Item.description, ...(job.Item.requirements ?? []), `Skills: ${(job.Item.skills ?? []).join(", ")}`].join("\n");
  const prompt = `Return JSON only with atsScore (0-100), matchedSkills (string[]), missingSkills (string[]), confidence (0-1), and summary. Compare this resume only to this job.\n\nRESUME:\n${String(extraction.Items[0].rawText ?? "").slice(0, 12000)}\n\nJOB:\n${jobText.slice(0, 6000)}`;
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${await apiKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, temperature: 0.1, response_format: { type: "json_object" }, messages: [{ role: "user", content: prompt }] }),
  });
  if (!response.ok) throw new Error(`AI scoring failed: ${response.status}`);
  const raw = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const analysis = parseJson(raw.choices?.[0]?.message?.content ?? "{}");
  const now = new Date().toISOString();
  const normalized = {
    atsScore: Math.max(0, Math.min(100, Number(analysis.atsScore) || 0)),
    matchedSkills: Array.isArray(analysis.matchedSkills) ? analysis.matchedSkills.map(String).slice(0, 20) : [],
    missingSkills: Array.isArray(analysis.missingSkills) ? analysis.missingSkills.map(String).slice(0, 20) : [],
    confidence: Math.max(0, Math.min(1, Number(analysis.confidence) || 0)),
    summary: String(analysis.summary ?? "No summary generated."),
  };

  await Promise.all([
    dynamo.send(new PutCommand({
      TableName,
      Item: { PK: `APPLICATION#${applicationId}`, SK: `JOB#${application.jobId}#ANALYSIS#${now}`, entityType: "APPLICATION_ANALYSIS", applicationId, jobId: application.jobId, tenantId: application.jobTenantId, resumeId: application.resumeId, analyzedAt: now, modelId: model, ...normalized },
    })),
    dynamo.send(new UpdateCommand({
      TableName, Key: { PK: application.PK, SK: application.SK },
      UpdateExpression: "SET #status = :status, updatedAt = :now, GSI1SK = :gsi1sk",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: { ":status": "AI_REVIEWED", ":now": now, ":gsi1sk": `STATUS#AI_REVIEWED#UPDATED#${now}#CANDIDATE#${application.candidateId}` },
    })),
  ]);
  return { applicationId, ...normalized };
};
