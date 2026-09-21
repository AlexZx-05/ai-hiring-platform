import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { dynamo, requireTableName } from "../../shared/dynamodb.js";
import { getHttpMethod, getPathParam, json } from "../../shared/http.js";

/** Public read-only careers endpoint. It deliberately exposes only open jobs. */
export async function main(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> {
  if (getHttpMethod(event) === "OPTIONS") return json(200, { ok: true });

  const tenantSlug = getPathParam(event, "tenantSlug");
  const slug = getPathParam(event, "slug");
  if (!tenantSlug || !slug) return json(400, { message: "tenantSlug and slug are required" });

  const response = await dynamo.send(new QueryCommand({
    TableName: requireTableName(),
    IndexName: "GSI3",
    KeyConditionExpression: "GSI3PK = :pk AND GSI3SK = :sk",
    ExpressionAttributeValues: {
      ":pk": `PUBLIC#${tenantSlug}`,
      ":sk": `SLUG#${slug}`,
    },
    Limit: 1,
  }));
  const job = response.Items?.[0];
  if (!job || job.entityType !== "JOB" || job.status !== "OPEN") {
    return json(404, { message: "Public job not found" });
  }

  return json(200, {
    job: {
      jobId: job.jobId,
      tenantId: job.tenantId,
      publicTenantSlug: job.publicTenantSlug,
      publicSlug: job.publicSlug,
      title: job.title,
      department: job.department,
      location: job.location,
      employmentType: job.employmentType,
      workMode: job.workMode,
      experienceLevel: job.experienceLevel,
      salaryRange: job.salaryRange,
      description: job.description,
      requirements: job.requirements,
      skills: job.skills,
      screeningQuestions: job.screeningQuestions ?? [],
      status: job.status,
      createdAt: job.createdAt,
    },
  });
}
