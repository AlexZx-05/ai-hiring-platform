import { api } from "./api";

export type AnalyzeResumeInput = {
  resumeId: string;
  candidateId?: string;
  jobRequirements?: string;
  mode?: "status" | "analyze";
};

export type AnalyzeResumeResponse = {
  resumeId: string;
  candidateId: string;
  analyzedAt: string;
  analysisVersion: string;
  atsScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  confidence: number;
  summary: string;
};

export async function analyzeResume(
  payload: AnalyzeResumeInput
): Promise<AnalyzeResumeResponse> {
  const response = await api.post<AnalyzeResumeResponse>(
    "/resume/analyze",
    payload
  );
  return response.data;
}

export type ResumeParseStatusResponse = {
  message: string;
  parseStatus: "PENDING" | "PROCESSING" | "FAILED" | "SUCCEEDED";
  parseDetails?: string;
};

export async function getResumeParseStatus(
  resumeId: string
): Promise<ResumeParseStatusResponse> {
  const response = await api.post<ResumeParseStatusResponse>("/resume/analyze", {
    resumeId,
    mode: "status",
  });
  return response.data;
}
