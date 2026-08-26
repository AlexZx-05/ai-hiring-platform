export type JobStatus = "OPEN" | "CLOSED" | "DRAFT";

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
