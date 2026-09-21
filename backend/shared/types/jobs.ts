export type JobStatus = "OPEN" | "CLOSED" | "DRAFT";

export type ScreeningQuestionType = "TEXT" | "YES_NO" | "SELECT";

/**
 * A job-specific question shown before a candidate submits an application.
 * Questions are configured by the recruiter and are deliberately limited to
 * job-relevant information; protected-characteristic questions must not be
 * collected or used for screening.
 */
export type ScreeningQuestion = {
  id: string;
  prompt: string;
  required: boolean;
  type: ScreeningQuestionType;
  options?: string[];
};

/** Immutable snapshot of a candidate response at the time of application. */
export type ApplicationScreeningAnswer = {
  questionId: string;
  prompt: string;
  answer: string;
};

export type JobRecord = {
  PK: string;
  SK: "PROFILE";
  entityType: "JOB";
  tenantId: string;
  jobId: string;
  jobTenantId?: string;
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
  status: JobStatus;
  publicTenantSlug: string;
  publicSlug: string;
  postedBy: string;
  createdAt: string;
  updatedAt: string;
  GSI1PK: string;
  GSI1SK: string;
  GSI2PK: string;
  GSI2SK: string;
  GSI3PK: string;
  GSI3SK: string;
};

export type ApplicationStatus =
  | "APPLIED"
  | "PARSING"
  | "AI_REVIEWED"
  | "UNDER_REVIEW"
  | "SHORTLISTED"
  | "INTERVIEW_RECOMMENDED"
  | "INTERVIEW_SCHEDULED"
  | "OFFER"
  | "HIRED"
  | "REJECTED";

export type ApplicationRecord = {
  PK: string;
  SK: string;
  entityType: "APPLICATION";
  tenantId: string;
  applicationId: string;
  jobId: string;
  jobTenantId?: string;
  candidateId: string;
  candidateEmail?: string;
  resumeId: string;
  resumeObjectKey: string;
  coverNote?: string;
  screeningAnswers: ApplicationScreeningAnswer[];
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
  GSI1PK: string;
  GSI1SK: string;
  GSI2PK: string;
  GSI2SK: string;
  GSI3PK: string;
  GSI3SK: string;
};
