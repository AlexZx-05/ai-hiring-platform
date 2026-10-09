import { api } from "./api";

function getAccessTokenHeaders(): { "X-Cognito-Access-Token": string } {
  const accessToken =
    typeof window !== "undefined"
      ? localStorage.getItem("auth_access_token")
      : null;

  if (!accessToken) {
    throw new Error("Your sign-in session has expired. Please sign in again.");
  }

  return { "X-Cognito-Access-Token": accessToken };
}

export type AnalyzeResumeInput = {
  resumeId: string;
  candidateId?: string;
  jobRequirements: string;
  mode?: "status" | "submitText" | "analyze";
  resumeText?: string;
};

export type AnalyzeResumeResponse = {
  resumeId: string;
  candidateId: string;
  analyzedAt: string;
  analysisVersion: string;
  atsScore: number;
  scoreBreakdown?: {
    requiredSkills: number;
    responsibilities: number;
    relevantExperience: number;
  };
  matchedSkills: string[];
  missingSkills: string[];
  evidence?: Array<{
    criterion: string;
    status: "SUPPORTED" | "PARTIAL" | "NOT_FOUND";
    resumeEvidence: string;
  }>;
  strengths?: string[];
  improvementTips?: string[];
  confidence: number;
  summary: string;
  applicationRecommendation?: {
    label: "Consider applying" | "Review your evidence first";
    rationale: string;
  };
  cacheHit?: boolean;
  providerStatus?: "LIVE" | "FALLBACK";
  providerMessage?: string;
};

export async function analyzeResume(
  payload: AnalyzeResumeInput
): Promise<AnalyzeResumeResponse> {
  const response = await api.post<AnalyzeResumeResponse>(
    "/resume/analyze",
    payload,
    { headers: getAccessTokenHeaders(), timeout: 25000 }
  );
  return response.data;
}

export async function submitResumeText(
  resumeId: string,
  resumeObjectKey: string,
  resumeText: string
): Promise<void> {
  await api.post(
    "/resume/analyze",
    { resumeId, resumeObjectKey, mode: "submitText", resumeText },
    { headers: getAccessTokenHeaders(), timeout: 25000 }
  );
}

export type ResumeParseStatusResponse = {
  message: string;
  parseStatus: "PENDING" | "PROCESSING" | "FAILED" | "SUCCEEDED";
  parseDetails?: string;
};

export async function getResumeParseStatus(
  resumeId: string
): Promise<ResumeParseStatusResponse> {
  const response = await api.post<ResumeParseStatusResponse>(
    "/resume/analyze",
    {
      resumeId,
      mode: "status",
    },
    { headers: getAccessTokenHeaders() }
  );
  return response.data;
}
