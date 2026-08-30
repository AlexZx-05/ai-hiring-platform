import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";

import { QueryCommand } from "@aws-sdk/lib-dynamodb";

import { dynamo, requireTableName } from "../../shared/dynamodb.js";
import { json } from "../../shared/http.js";
import { withAuth } from "../../shared/middlewares/with-auth.js";
import type { AuthContext } from "../../shared/types/auth.js";

type DashboardApplication = {
  applicationId: string;
  candidateId: string;
  candidateEmail?: string;
  jobId: string;
  jobTitle?: string;
  status: string;

  atsScore?: number;
  matchedSkills?: string[];
  missingSkills?: string[];
  confidence?: number;
  summary?: string;

  createdAt: string;
  updatedAt: string;
};

type AnalysisRecord = {
  atsScore?: number;
  matchedSkills?: string[];
  missingSkills?: string[];
  confidence?: number;
  summary?: string;
  analyzedAt?: string;
};

async function listTenantJobs(
  tableName: string,
  tenantId: string
): Promise<Record<string, unknown>[]> {
  const response = await dynamo.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: "GSI1",
      KeyConditionExpression:
        "GSI1PK = :pk AND begins_with(GSI1SK, :prefix)",
      ExpressionAttributeValues: {
        ":pk": `TENANT#${tenantId}#JOBS`,
        ":prefix": "STATUS#",
      },
      ScanIndexForward: false,
      Limit: 100,
    })
  );

  return (response.Items ?? []).filter(
    (item) => item.entityType === "JOB"
  );
}

async function getLatestApplicationAnalysis(
  tableName: string,
  applicationId: string,
  jobId: string
): Promise<AnalysisRecord | undefined> {
  const response = await dynamo.send(
    new QueryCommand({
      TableName: tableName,

      KeyConditionExpression:
        "PK = :pk AND begins_with(SK, :sk)",

      ExpressionAttributeValues: {
        ":pk": `APPLICATION#${applicationId}`,
        ":sk": `JOB#${jobId}#ANALYSIS#`,
      },

      ScanIndexForward: false,

      Limit: 1,
    })
  );

  const item = response.Items?.[0];

  if (
    !item ||
    item.entityType !== "APPLICATION_ANALYSIS"
  ) {
    return undefined;
  }

  return {
    atsScore:
      typeof item.atsScore === "number"
        ? item.atsScore
        : undefined,

    matchedSkills: Array.isArray(item.matchedSkills)
      ? item.matchedSkills.map(String)
      : undefined,

    missingSkills: Array.isArray(item.missingSkills)
      ? item.missingSkills.map(String)
      : undefined,

    confidence:
      typeof item.confidence === "number"
        ? item.confidence
        : undefined,

    summary: item.summary
      ? String(item.summary)
      : undefined,

    analyzedAt: item.analyzedAt
      ? String(item.analyzedAt)
      : undefined,
  };
}

async function listJobApplications(
  tableName: string,
  tenantId: string,
  job: Record<string, unknown>
): Promise<DashboardApplication[]> {
  const jobId = String(job.jobId);

  const response = await dynamo.send(
    new QueryCommand({
      TableName: tableName,

      IndexName: "GSI1",

      KeyConditionExpression: "GSI1PK = :pk",

      ExpressionAttributeValues: {
        ":pk": `TENANT#${tenantId}#JOB#${jobId}`,
      },

      ScanIndexForward: false,

      Limit: 100,
    })
  );

  const applicationItems = (
    response.Items ?? []
  ).filter(
    (item) => item.entityType === "APPLICATION"
  );

  const applications = await Promise.all(
    applicationItems.map(async (item) => {
      const applicationId = String(
        item.applicationId
      );

      const candidateId = String(
        item.candidateId
      );

      const analysis =
        await getLatestApplicationAnalysis(
          tableName,
          applicationId,
          jobId
        );

      return {
        applicationId,

        candidateId,

        candidateEmail: item.candidateEmail
          ? String(item.candidateEmail)
          : undefined,

        jobId,

        jobTitle: String(
          job.title ?? ""
        ),

        status: String(
          item.status ?? "APPLIED"
        ),

        atsScore: analysis?.atsScore,

        matchedSkills:
          analysis?.matchedSkills,

        missingSkills:
          analysis?.missingSkills,

        confidence:
          analysis?.confidence,

        summary:
          analysis?.summary,

        createdAt: String(
          item.createdAt ?? ""
        ),

        updatedAt: String(
          item.updatedAt ?? ""
        ),
      };
    })
  );

  return applications;
}

async function handler(
  _event: APIGatewayProxyEventV2,
  auth: AuthContext
): Promise<APIGatewayProxyStructuredResultV2> {
  try {
    const tableName =
      requireTableName();

    /*
     * 1. Get all jobs belonging
     *    to the recruiter's tenant.
     */
    const jobs =
      await listTenantJobs(
        tableName,
        auth.tenantId
      );

    /*
     * 2. Get applications
     *    for every job.
     */
    const applicationGroups =
      await Promise.all(
        jobs.map((job) =>
          listJobApplications(
            tableName,
            auth.tenantId,
            job
          )
        )
      );

    const applications =
      applicationGroups.flat();

    /*
     * 3. Build dashboard counters.
     */
    const summary = {
      totalJobs: jobs.length,

      openJobs: jobs.filter(
        (job) =>
          job.status === "OPEN"
      ).length,

      totalApplications:
        applications.length,

      newApplications:
        applications.filter(
          (application) =>
            application.status ===
            "APPLIED"
        ).length,

      parsing:
        applications.filter(
          (application) =>
            application.status ===
            "PARSING"
        ).length,

      aiReviewed:
        applications.filter(
          (application) =>
            application.status ===
            "AI_REVIEWED"
        ).length,

      underReview:
        applications.filter(
          (application) =>
            application.status ===
            "UNDER_REVIEW"
        ).length,

      shortlisted:
        applications.filter(
          (application) =>
            application.status ===
            "SHORTLISTED"
        ).length,

      interviewRecommended:
        applications.filter(
          (application) =>
            application.status ===
            "INTERVIEW_RECOMMENDED"
        ).length,

      interviewScheduled:
        applications.filter(
          (application) =>
            application.status ===
            "INTERVIEW_SCHEDULED"
        ).length,

      offers:
        applications.filter(
          (application) =>
            application.status ===
            "OFFER"
        ).length,

      hired:
        applications.filter(
          (application) =>
            application.status ===
            "HIRED"
        ).length,

      rejected:
        applications.filter(
          (application) =>
            application.status ===
            "REJECTED"
        ).length,
    };

    /*
     * 4. AI-assisted candidate ranking.
     *
     * AI score is only used as a
     * screening/ranking aid.
     *
     * The recruiter remains responsible
     * for the final hiring decision.
     */
    const rankedCandidates =
      [...applications]
        .filter(
          (application) =>
            typeof application.atsScore ===
            "number"
        )
        .sort((a, b) => {
          const scoreDifference =
            (b.atsScore ?? 0) -
            (a.atsScore ?? 0);

          if (
            scoreDifference !== 0
          ) {
            return scoreDifference;
          }

          return (
            new Date(
              b.createdAt
            ).getTime() -
            new Date(
              a.createdAt
            ).getTime()
          );
        })
        .map(
          (
            application,
            index
          ) => ({
            rank: index + 1,
            ...application,
          })
        )
        .slice(0, 20);

    /*
     * 5. Most recently submitted
     *    applications.
     */
    const recentApplications =
      [...applications]
        .sort(
          (a, b) =>
            new Date(
              b.createdAt
            ).getTime() -
            new Date(
              a.createdAt
            ).getTime()
        )
        .slice(0, 20);

    /*
     * 6. Return dashboard payload.
     */
    return json(200, {
      summary,
      jobs,
      recentApplications,
      rankedCandidates,
    });
  } catch (error) {
    console.error(
      "Recruiter dashboard failed:",
      error
    );

    return json(500, {
      message:
        "Unable to load recruiter dashboard",
    });
  }
}

export const main =
  withAuth(
    handler,
    ["recruiter", "admin"]
  );