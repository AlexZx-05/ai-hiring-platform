import type { Handler } from "aws-lambda";
import {
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

import { dynamo, requireTableName } from "../../shared/dynamodb.js";

const secrets = new SecretsManagerClient({
  region: process.env.AWS_REGION ?? "ap-south-1",
});

const secretArn = process.env.XAI_SECRET_ARN;

const apiUrl =
  process.env.XAI_API_URL ??
  "https://api.x.ai/v1/chat/completions";

const model =
  process.env.XAI_MODEL_ID ??
  "grok-3-mini";

type AnalysisEvent = {
  applicationId?: string;
};

type AIAnalysis = {
  atsScore?: unknown;
  matchedSkills?: unknown;
  missingSkills?: unknown;
  confidence?: unknown;
  summary?: unknown;
};

type NormalizedAnalysis = {
  atsScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  confidence: number;
  summary: string;
};

async function apiKey(): Promise<string> {
  if (!secretArn) {
    throw new Error("XAI_SECRET_ARN is not configured");
  }

  const response = await secrets.send(
    new GetSecretValueCommand({
      SecretId: secretArn,
    })
  );

  const value = response.SecretString ?? "";

  if (!value.trim()) {
    throw new Error("XAI secret is empty");
  }

  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;

    const key = String(
      parsed.XAI_API_KEY ??
        parsed.apiKey ??
        ""
    ).trim();

    if (!key) {
      throw new Error("XAI API key is missing from secret");
    }

    return key;
  } catch (error) {
    /*
     * If the secret is not JSON, treat the complete
     * SecretString as the API key.
     */
    if (error instanceof SyntaxError) {
      const key = value.trim();

      if (!key) {
        throw new Error("XAI API key is empty");
      }

      return key;
    }

    throw error;
  }
}

function parseJson(raw: string): Record<string, unknown> {
  const cleaned = raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  if (!cleaned) {
    return {};
  }

  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    /*
     * Some models may return additional text around the JSON.
     * Try to extract the first JSON object.
     */
    const match = cleaned.match(/\{[\s\S]*\}/);

    if (!match) {
      throw new Error("AI response did not contain valid JSON");
    }

    try {
      return JSON.parse(match[0]) as Record<string, unknown>;
    } catch {
      throw new Error("AI response contained invalid JSON");
    }
  }
}

function normalizeStringList(
  value: unknown,
  limit = 20
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item).trim())
    .filter(Boolean)
    .slice(0, limit);
}

function normalizeScore(value: unknown): number {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(100, number)
  );
}

function normalizeConfidence(value: unknown): number {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(1, number)
  );
}

function normalizeAnalysis(
  analysis: AIAnalysis
): NormalizedAnalysis {
  return {
    atsScore: normalizeScore(
      analysis.atsScore
    ),

    matchedSkills: normalizeStringList(
      analysis.matchedSkills
    ),

    missingSkills: normalizeStringList(
      analysis.missingSkills
    ),

    confidence: normalizeConfidence(
      analysis.confidence
    ),

    summary:
      String(
        analysis.summary ??
          "No summary generated."
      ).trim() ||
      "No summary generated.",
  };
}

function buildJobText(
  job: Record<string, unknown>
): string {
  const description = String(
    job.description ?? ""
  );

  const requirements = Array.isArray(
    job.requirements
  )
    ? job.requirements
        .map(String)
        .filter(Boolean)
    : [];

  const skills = Array.isArray(
    job.skills
  )
    ? job.skills
        .map(String)
        .filter(Boolean)
    : [];

  return [
    `Job Title: ${String(job.title ?? "")}`,
    `Department: ${String(job.department ?? "")}`,
    `Experience Level: ${String(
      job.experienceLevel ?? ""
    )}`,
    `Employment Type: ${String(
      job.employmentType ?? ""
    )}`,
    `Work Mode: ${String(
      job.workMode ?? ""
    )}`,
    `Location: ${String(
      job.location ?? ""
    )}`,
    "",
    "Job Description:",
    description,
    "",
    "Requirements:",
    ...requirements.map(
      (requirement) => `- ${requirement}`
    ),
    "",
    `Required Skills: ${skills.join(", ")}`,
  ].join("\n");
}

function buildPrompt(
  resumeText: string,
  jobText: string
): string {
  return `
You are an AI-assisted recruitment screening system.

Compare the candidate resume ONLY against the supplied job.

Do not invent candidate experience.
Do not assume skills that are not supported by the resume.
Do not make decisions based on protected or sensitive characteristics.
Do not consider age, gender, race, religion, nationality, disability, marital status, or other protected characteristics.

Return ONLY valid JSON.

The JSON must contain exactly these fields:

{
  "atsScore": number,
  "matchedSkills": string[],
  "missingSkills": string[],
  "confidence": number,
  "summary": string
}

Rules:

- atsScore must be between 0 and 100.
- confidence must be between 0 and 1.
- matchedSkills must contain skills supported by the resume and relevant to the job.
- missingSkills must contain important job skills/requirements that are not supported by the resume.
- summary must briefly explain the candidate's job relevance.
- Do not include markdown.
- Do not include code fences.
- Do not include additional JSON fields.

CANDIDATE RESUME:
${resumeText.slice(0, 12000)}

JOB:
${jobText.slice(0, 6000)}
`.trim();
}

async function findApplication(
  tableName: string,
  applicationId: string
) {
  const response = await dynamo.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: "GSI2",
      KeyConditionExpression:
        "GSI2PK = :pk",
      ExpressionAttributeValues: {
        ":pk":
          `APPLICATION#${applicationId}`,
      },
      Limit: 1,
    })
  );

  return response.Items?.[0];
}

async function findJob(
  tableName: string,
  tenantId: string,
  jobId: string
) {
  const response = await dynamo.send(
    new GetCommand({
      TableName: tableName,
      Key: {
        PK:
          `TENANT#${tenantId}#JOB#${jobId}`,
        SK: "PROFILE",
      },
    })
  );

  return response.Item;
}

async function findResumeExtraction(
  tableName: string,
  applicationPK: string,
  resumeId: string
) {
  const response = await dynamo.send(
    new QueryCommand({
      TableName: tableName,

      KeyConditionExpression:
        "PK = :pk AND begins_with(SK, :sk)",

      ExpressionAttributeValues: {
        ":pk": applicationPK,
        ":sk":
          `RESUME#${resumeId}#EXTRACTION#`,
      },

      ScanIndexForward: false,
      Limit: 1,
    })
  );

  return response.Items?.[0];
}

async function callAI(
  resumeText: string,
  jobText: string
): Promise<NormalizedAnalysis> {
  const key = await apiKey();

  const prompt = buildPrompt(
    resumeText,
    jobText
  );

  const response = await fetch(
    apiUrl,
    {
      method: "POST",

      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        model,

        temperature: 0.1,

        response_format: {
          type: "json_object",
        },

        messages: [
          {
            role: "system",
            content:
              "You are an AI-assisted recruitment screening system. Return valid JSON only.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const errorText =
      await response.text();

    console.error(
      "XAI API error:",
      response.status,
      errorText.slice(0, 1000)
    );

    throw new Error(
      `AI scoring failed: ${response.status}`
    );
  }

  const rawResponse =
    (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
    };

  const rawContent =
    rawResponse
      .choices?.[0]
      ?.message?.content ?? "";

  if (!rawContent) {
    throw new Error(
      "AI returned an empty response"
    );
  }

  const analysis =
    parseJson(rawContent);

  return normalizeAnalysis(
    analysis
  );
}

export const main: Handler<
  AnalysisEvent
> = async (event) => {
  const applicationId = String(
    event.applicationId ?? ""
  ).trim();

  if (!applicationId) {
    throw new Error(
      "applicationId is required"
    );
  }

  const tableName =
    requireTableName();

  console.log(
    `Starting AI analysis for application ${applicationId}`
  );

  /*
   * 1. Find application.
   */
  const application =
    await findApplication(
      tableName,
      applicationId
    );

  if (
    !application ||
    application.entityType !==
      "APPLICATION"
  ) {
    throw new Error(
      "Application not found"
    );
  }

  const jobTenantId = String(
    application.jobTenantId ??
      application.tenantId ??
      ""
  ).trim();

  const jobId = String(
    application.jobId ?? ""
  ).trim();

  const resumeId = String(
    application.resumeId ?? ""
  ).trim();

  if (!jobTenantId || !jobId) {
    throw new Error(
      "Application is missing job information"
    );
  }

  if (!resumeId) {
    throw new Error(
      "Application is missing resumeId"
    );
  }

  /*
   * 2. Get job and parsed resume.
   */
  const [job, extraction] =
    await Promise.all([
      findJob(
        tableName,
        jobTenantId,
        jobId
      ),

      findResumeExtraction(
        tableName,
        String(application.PK),
        resumeId
      ),
    ]);

  if (!job) {
    throw new Error(
      "Job not found"
    );
  }

  if (!extraction) {
    throw new Error(
      "Parsed resume is not available"
    );
  }

  const resumeText =
    String(
      extraction.rawText ?? ""
    ).trim();

  if (!resumeText) {
    throw new Error(
      "Parsed resume does not contain text"
    );
  }

  /*
   * 3. Prepare job information.
   */
  const jobText =
    buildJobText(job);

  /*
   * 4. Call xAI.
   */
  const normalized =
    await callAI(
      resumeText,
      jobText
    );

  const now =
    new Date().toISOString();

  /*
   * 5. Save immutable analysis record.
   */
  await dynamo.send(
    new PutCommand({
      TableName: tableName,

      Item: {
        PK:
          `APPLICATION#${applicationId}`,

        SK:
          `JOB#${jobId}#ANALYSIS#${now}`,

        entityType:
          "APPLICATION_ANALYSIS",

        applicationId,

        jobId,

        tenantId:
          jobTenantId,

        resumeId,

        analyzedAt: now,

        modelId: model,

        atsScore:
          normalized.atsScore,

        matchedSkills:
          normalized.matchedSkills,

        missingSkills:
          normalized.missingSkills,

        confidence:
          normalized.confidence,

        summary:
          normalized.summary,
      },
    })
  );

  /*
   * 6. Update the APPLICATION itself.
   *
   * This is important because the recruiter
   * dashboard reads ATS information from the
   * application records.
   */
  await dynamo.send(
    new UpdateCommand({
      TableName: tableName,

      Key: {
        PK: application.PK,
        SK: application.SK,
      },

      UpdateExpression: `
        SET
          #status = :status,
          updatedAt = :now,
          atsScore = :atsScore,
          matchedSkills = :matchedSkills,
          missingSkills = :missingSkills,
          confidence = :confidence,
          summary = :summary,
          analyzedAt = :now,
          modelId = :modelId,
          GSI1SK = :gsi1sk
      `,

      ExpressionAttributeNames: {
        "#status": "status",
      },

      ExpressionAttributeValues: {
        ":status":
          "AI_REVIEWED",

        ":now":
          now,

        ":atsScore":
          normalized.atsScore,

        ":matchedSkills":
          normalized.matchedSkills,

        ":missingSkills":
          normalized.missingSkills,

        ":confidence":
          normalized.confidence,

        ":summary":
          normalized.summary,

        ":modelId":
          model,

        ":gsi1sk":
          `STATUS#AI_REVIEWED#UPDATED#${now}#CANDIDATE#${application.candidateId}`,
      },
    })
  );

  console.log(
    `AI analysis completed for application ${applicationId}`,
    {
      atsScore:
        normalized.atsScore,
      confidence:
        normalized.confidence,
    }
  );

  return {
    applicationId,
    ...normalized,
  };
};