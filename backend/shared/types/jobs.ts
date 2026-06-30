export type JobStatus = "OPEN" | "CLOSED" | "DRAFT";

export type JobRecord = {
  PK: string;
  SK: "PROFILE";
  entityType: "JOB";
  tenantId: string;
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
  status: JobStatus;
  postedBy: string;
  createdAt: string;
  updatedAt: string;
  GSI1PK: string;
  GSI1SK: string;
  GSI2PK: string;
  GSI2SK: string;
};

export type ApplicationStatus =
  | "SUBMITTED"
  | "PARSING"
  | "UNDER_REVIEW"
  | "SHORTLISTED"
  | "REJECTED";

export type ApplicationRecord = {
  PK: string;
  SK: string;
  entityType: "APPLICATION";
  tenantId: string;
  applicationId: string;
  jobId: string;
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
};
