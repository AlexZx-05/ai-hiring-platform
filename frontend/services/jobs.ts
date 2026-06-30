import { api } from "./api";

export type Job = {
  jobId: string;
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
  status: "OPEN" | "CLOSED" | "DRAFT";
  createdAt: string;
};

export type Application = {
  applicationId: string;
  jobId: string;
  resumeId: string;
  status: "SUBMITTED" | "PARSING" | "UNDER_REVIEW" | "SHORTLISTED" | "REJECTED";
  coverNote?: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateApplicationInput = {
  jobId: string;
  resumeId: string;
  resumeObjectKey: string;
  coverNote?: string;
};

const demoJobs: Job[] = [
  {
    jobId: "demo-frontend-engineer",
    title: "Frontend Engineer",
    department: "Product Engineering",
    location: "Bengaluru, India",
    employmentType: "Full-time",
    workMode: "Hybrid",
    experienceLevel: "2-4 years",
    salaryRange: "Competitive",
    description:
      "Build polished candidate and recruiter experiences for an AI hiring workflow using React, TypeScript, and modern product patterns.",
    requirements: [
      "Strong React and TypeScript fundamentals",
      "Experience with API-driven dashboards",
      "Comfort with accessibility and responsive UI",
    ],
    skills: ["React", "TypeScript", "Next.js", "TailwindCSS"],
    status: "OPEN",
    createdAt: new Date().toISOString(),
  },
  {
    jobId: "demo-ai-platform-engineer",
    title: "AI Platform Engineer",
    department: "AI Systems",
    location: "Remote",
    employmentType: "Full-time",
    workMode: "Remote",
    experienceLevel: "3-6 years",
    description:
      "Own resume parsing, scoring pipelines, and explainable ranking services across serverless AWS infrastructure.",
    requirements: [
      "Backend experience with TypeScript or Python",
      "AWS Lambda, S3, DynamoDB, and queue-based systems",
      "Production mindset for observability and data quality",
    ],
    skills: ["AWS Lambda", "DynamoDB", "S3", "AI APIs", "TypeScript"],
    status: "OPEN",
    createdAt: new Date().toISOString(),
  },
  {
    jobId: "demo-recruitment-ops",
    title: "Recruitment Operations Analyst",
    department: "Talent",
    location: "Mumbai, India",
    employmentType: "Contract",
    workMode: "On-site",
    experienceLevel: "1-3 years",
    description:
      "Manage candidate pipelines, validate AI screening outcomes, and help recruiters move faster with clean hiring operations.",
    requirements: [
      "Experience managing applicant pipelines",
      "Clear communication with recruiters and candidates",
      "Comfort using dashboards and structured data",
    ],
    skills: ["Recruiting", "ATS", "Analytics", "Communication"],
    status: "OPEN",
    createdAt: new Date().toISOString(),
  },
];

function shouldUseDemoFallback(error: unknown): boolean {
  const status = (error as { response?: { status?: number } })?.response?.status;
  return status === 404 || status === 501 || status === 502 || status === 503;
}

export async function listJobs(): Promise<{ jobs: Job[]; source: "api" | "demo" }> {
  try {
    const response = await api.get<{ jobs: Job[] }>("/jobs");
    return { jobs: response.data.jobs, source: "api" };
  } catch (error) {
    if (shouldUseDemoFallback(error)) {
      return { jobs: demoJobs, source: "demo" };
    }
    throw error;
  }
}

export async function getJob(jobId: string): Promise<{ job: Job; source: "api" | "demo" }> {
  try {
    const response = await api.get<{ job: Job }>(`/jobs/${jobId}`);
    return { job: response.data.job, source: "api" };
  } catch (error) {
    if (shouldUseDemoFallback(error)) {
      const job = demoJobs.find((item) => item.jobId === jobId);
      if (job) {
        return { job, source: "demo" };
      }
    }
    throw error;
  }
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
  const response = await api.get<{ applications: Application[] }>("/applications");
  return response.data.applications;
}
