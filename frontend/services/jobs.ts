import { api } from "./api";
import {
  demoApplications,
  demoJobs,
  getDemoJob,
} from "./demo-data";
import { getDemoSession } from "./auth";

export type ScreeningQuestion = {
  id: string;
  prompt: string;
  required: boolean;
  type: "TEXT" | "YES_NO" | "SELECT";
  options?: string[];
};

export type ScreeningAnswer = {
  questionId: string;
  prompt?: string;
  answer: string;
};

export type Job = {
  jobId: string;
  tenantId?: string;
  publicTenantSlug?: string;
  publicSlug?: string;
  title: string;
  department: string;
  location: string;
  employmentType: string;
  workMode: "Remote" | "Hybrid" | "On-site";
  experienceLevel: string;
  salaryRange?: string;
  description: string;
  requirements: string[];
  skills: string[];
  screeningQuestions: ScreeningQuestion[];
  status: "OPEN" | "CLOSED" | "DRAFT";
  createdAt: string;
};

export type Application = {
  applicationId: string;
  jobId: string;
  resumeId: string;
  status: "APPLIED" | "PARSING" | "AI_REVIEWED" | "UNDER_REVIEW" | "SHORTLISTED" | "INTERVIEW_RECOMMENDED" | "INTERVIEW_SCHEDULED" | "OFFER" | "HIRED" | "REJECTED";
  coverNote?: string;
  screeningAnswers?: ScreeningAnswer[];
  createdAt: string;
  updatedAt: string;
  processingError?: string;
};

export type CreateApplicationInput = {
  jobId: string;
  publicTenantSlug: string;
  publicSlug: string;
  resumeId: string;
  resumeObjectKey: string;
  coverNote?: string;
  screeningAnswers?: ScreeningAnswer[];
};

export async function listJobs(): Promise<{ jobs: Job[]; source: "api" | "demo" }> {
  if (getDemoSession()) {
    return { jobs: demoJobs, source: "demo" };
  }
  const response = await api.get<{ jobs: Job[] }>("/jobs");
  return { jobs: response.data.jobs, source: "api" };
}

export async function getPublicJob(tenantSlug: string, slug: string): Promise<Job> {
  const response = await api.get<{ job: Job }>(`/careers/${encodeURIComponent(tenantSlug)}/${encodeURIComponent(slug)}`);
  return response.data.job;
}

export async function getJob(jobId: string): Promise<{ job: Job; source: "api" | "demo" }> {
  if (getDemoSession()) {
    const job = getDemoJob(jobId);
    if (job) {
      return { job, source: "demo" };
    }
  }
  const response = await api.get<{ job: Job }>(`/jobs/${jobId}`);
  return { job: response.data.job, source: "api" };
}

export async function createApplication(
  payload: CreateApplicationInput
): Promise<Application> {
  const response = await api.post<{ application: Application }>(
    "/applications",
    payload
  );
  return response.data.application;
}

export async function listApplications(): Promise<Application[]> {
  if (getDemoSession()) {
    return demoApplications;
  }
  const response = await api.get<{ applications: Application[] }>("/applications");
  return response.data.applications;
}
