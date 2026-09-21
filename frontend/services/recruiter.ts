import { api } from "./api";
import type { Application, Job, ScreeningQuestion } from "./jobs";
import {
  demoJobs,
  getDemoCandidateRecords,
  getDemoRecruiterApplications,
} from "./demo-data";
import { getDemoSession } from "./auth";

export type RecruiterApplication = Application & {
  candidateId: string;
  candidateEmail?: string;
  resumeObjectKey?: string;
  recruiterNote?: string;
  reviewedBy?: string;
  atsScore?: number;
  matchedSkills?: string[];
  missingSkills?: string[];
  screeningAnswers?: Application["screeningAnswers"];
};

export type CreateJobInput = {
  title: string;
  department: string;
  location: string;
  employmentType: string;
  workMode: Job["workMode"];
  experienceLevel: string;
  salaryRange?: string;
  description: string;
  requirements: string[];
  skills: string[];
  screeningQuestions?: Array<Omit<ScreeningQuestion, "id">>;
  status?: Job["status"];
};

export type CandidateRecord = Record<string, unknown> & {
  entityType?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type RecruiterInvitation = {
  invitationId: string;
  email: string;
  tenantId: string;
  role: "recruiter";
  status: "SENT";
  createdAt: string;
};

/** Admin-only: Cognito delivers the temporary-password invitation email. */
export async function inviteRecruiter(email: string): Promise<RecruiterInvitation> {
  const response = await api.post<{ invitation: RecruiterInvitation }>(
    "/admin/recruiter-invitations",
    { email }
  );
  return response.data.invitation;
}

export async function listRecruiterJobs(): Promise<Job[]> {
  if (getDemoSession()) {
    return demoJobs;
  }
  const response = await api.get<{ jobs: Job[] }>("/recruiter/jobs");
  return response.data.jobs;
}

export async function createRecruiterJob(payload: CreateJobInput): Promise<Job> {
  const response = await api.post<{ job: Job }>("/jobs", payload);
  return response.data.job;
}

export async function listJobApplications(
  jobId: string
): Promise<RecruiterApplication[]> {
  if (getDemoSession()) {
    return getDemoRecruiterApplications(jobId);
  }
  const response = await api.get<{ applications: RecruiterApplication[] }>(
    `/recruiter/jobs/${jobId}/applications`
  );
  return response.data.applications;
}

export async function updateApplicationStatus(payload: {
  applicationId: string;
  candidateId: string;
  status: RecruiterApplication["status"];
  recruiterNote?: string;
}): Promise<RecruiterApplication> {
  const response = await api.patch<{ application: RecruiterApplication }>(
    `/recruiter/applications/${payload.applicationId}/status`,
    payload
  );
  return response.data.application;
}

export type ResumeDownloadResponse = {
  applicationId: string;
  candidateId: string;
  resumeId: string;
  downloadUrl: string;
  expiresIn: number;
};

export async function getResumeDownloadUrl(payload: {
  applicationId: string;
  candidateId: string;
}): Promise<ResumeDownloadResponse> {
  const response = await api.get<ResumeDownloadResponse>(
    `/recruiter/applications/${payload.applicationId}/resume-url`,
    {
      params: {
        candidateId: payload.candidateId,
      },
    }
  );
  return response.data;
}

export async function getRecruiterCandidate(
  candidateId: string
): Promise<{ candidateId: string; records: CandidateRecord[] }> {
  if (getDemoSession()) {
    return {
      candidateId,
      records: getDemoCandidateRecords(candidateId),
    };
  }
  const response = await api.get<{ candidateId: string; records: CandidateRecord[] }>(
    `/recruiter/candidates/${candidateId}`
  );
  return response.data;
}
