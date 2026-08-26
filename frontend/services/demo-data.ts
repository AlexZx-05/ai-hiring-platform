import type { Application, Job } from "./jobs";
import type { CandidateRecord, RecruiterApplication } from "./recruiter";
import { getDemoSession } from "./auth";

const now = new Date("2026-07-05T10:00:00.000Z");

function daysAgo(days: number): string {
  const date = new Date(now);
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

export const demoJobs: Job[] = [
  {
    jobId: "job-demo-frontend",
    title: "Frontend Engineer",
    department: "Product Engineering",
    location: "Bengaluru",
    employmentType: "Full-time",
    workMode: "Hybrid",
    experienceLevel: "2-4 years",
    salaryRange: "₹10L - ₹16L",
    description:
      "Build polished recruiter and candidate workflows for an AI hiring platform with modern React and API integrations.",
    requirements: [
      "Strong React and TypeScript fundamentals",
      "Experience building production dashboards",
      "Comfort working with REST APIs and auth flows",
    ],
    skills: ["React", "TypeScript", "Next.js", "Tailwind CSS", "REST APIs"],
    status: "OPEN",
    createdAt: daysAgo(10),
  },
  {
    jobId: "job-demo-backend",
    title: "Backend Engineer",
    department: "Platform",
    location: "Hyderabad",
    employmentType: "Full-time",
    workMode: "Remote",
    experienceLevel: "3-5 years",
    salaryRange: "₹14L - ₹22L",
    description:
      "Design scalable backend services for resume processing, ranking, and recruiter operations across a multi-tenant system.",
    requirements: [
      "Experience with Node.js or TypeScript services",
      "Knowledge of AWS and serverless patterns",
      "Ability to design clean APIs and data models",
    ],
    skills: ["Node.js", "TypeScript", "AWS", "DynamoDB", "API Design"],
    status: "OPEN",
    createdAt: daysAgo(8),
  },
  {
    jobId: "job-demo-ml",
    title: "AI Screening Analyst",
    department: "AI Operations",
    location: "Pune",
    employmentType: "Full-time",
    workMode: "On-site",
    experienceLevel: "1-3 years",
    salaryRange: "₹8L - ₹12L",
    description:
      "Support resume analysis quality, prompt tuning, and recruiter-facing candidate scoring operations.",
    requirements: [
      "Strong written communication",
      "Understanding of hiring workflows",
      "Familiarity with prompts and evaluation logic",
    ],
    skills: ["Prompting", "Recruiting", "Quality Analysis", "Documentation"],
    status: "OPEN",
    createdAt: daysAgo(6),
  },
];

export const demoApplications: Application[] = [
  {
    applicationId: "app-demo-1",
    jobId: "job-demo-frontend",
    resumeId: "resume-demo-1",
    status: "UNDER_REVIEW",
    coverNote: "Built recruiter dashboards and internal admin tools.",
    createdAt: daysAgo(4),
    updatedAt: daysAgo(2),
  },
  {
    applicationId: "app-demo-2",
    jobId: "job-demo-backend",
    resumeId: "resume-demo-2",
    status: "SHORTLISTED",
    coverNote: "Worked on Node.js APIs and DynamoDB-backed services.",
    createdAt: daysAgo(5),
    updatedAt: daysAgo(1),
  },
  {
    applicationId: "app-demo-3",
    jobId: "job-demo-ml",
    resumeId: "resume-demo-3",
    status: "PARSING",
    coverNote: "Interested in AI-assisted screening operations.",
    createdAt: daysAgo(1),
    updatedAt: daysAgo(0),
  },
];

export const demoRecruiterApplications: RecruiterApplication[] = [
  {
    applicationId: "app-demo-1",
    jobId: "job-demo-frontend",
    resumeId: "resume-demo-1",
    status: "UNDER_REVIEW",
    coverNote: "Built recruiter dashboards and internal admin tools.",
    createdAt: daysAgo(4),
    updatedAt: daysAgo(2),
    candidateId: "candidate-demo-a",
    candidateEmail: "aisha.sharma@example.com",
    recruiterNote: "Strong UI ownership. Needs one deeper API round.",
    reviewedBy: "recruiter-demo",
    atsScore: 82,
    matchedSkills: ["React", "TypeScript", "Next.js"],
    missingSkills: ["REST APIs"],
  },
  {
    applicationId: "app-demo-2",
    jobId: "job-demo-backend",
    resumeId: "resume-demo-2",
    status: "SHORTLISTED",
    coverNote: "Worked on Node.js APIs and DynamoDB-backed services.",
    createdAt: daysAgo(5),
    updatedAt: daysAgo(1),
    candidateId: "candidate-demo-b",
    candidateEmail: "rahul.verma@example.com",
    recruiterNote: "Good platform fit. Move to interview.",
    reviewedBy: "recruiter-demo",
    atsScore: 91,
    matchedSkills: ["Node.js", "TypeScript", "AWS", "DynamoDB"],
    missingSkills: ["API Design"],
  },
  {
    applicationId: "app-demo-3",
    jobId: "job-demo-ml",
    resumeId: "resume-demo-3",
    status: "PARSING",
    coverNote: "Interested in AI-assisted screening operations.",
    createdAt: daysAgo(1),
    updatedAt: daysAgo(0),
    candidateId: "candidate-demo-c",
    candidateEmail: "neha.patel@example.com",
    atsScore: 68,
    matchedSkills: ["Prompting", "Documentation"],
    missingSkills: ["Recruiting"],
  },
];

export function getDemoJob(jobId: string): Job | undefined {
  return demoJobs.find((job) => job.jobId === jobId);
}

export function getDemoRecruiterApplications(jobId: string): RecruiterApplication[] {
  return demoRecruiterApplications.filter((application) => application.jobId === jobId);
}

export function getDemoCandidateRecords(candidateId: string): CandidateRecord[] {
  const applications = demoRecruiterApplications.filter(
    (application) => application.candidateId === candidateId
  );

  return applications.flatMap((application) => {
    const applicationRecord: CandidateRecord = {
      PK: `TENANT#demo#CANDIDATE#${candidateId}`,
      SK: `APPLICATION#${application.applicationId}`,
      entityType: "APPLICATION",
      applicationId: application.applicationId,
      jobId: application.jobId,
      resumeId: application.resumeId,
      candidateId: application.candidateId,
      candidateEmail: application.candidateEmail,
      status: application.status,
      coverNote: application.coverNote,
      recruiterNote: application.recruiterNote,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
    };

    const analysisRecord: CandidateRecord = {
      PK: `TENANT#demo#CANDIDATE#${candidateId}`,
      SK: `ANALYSIS#${application.resumeId}`,
      entityType: "RESUME_ANALYSIS",
      resumeId: application.resumeId,
      analyzedAt: application.updatedAt,
      atsScore: application.atsScore,
      matchedSkills: application.matchedSkills,
      missingSkills: application.missingSkills,
      summary: `Demo analysis for ${application.candidateEmail ?? candidateId}`,
      confidence: 0.86,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
    };

    const extractionRecord: CandidateRecord = {
      PK: `TENANT#demo#CANDIDATE#${candidateId}`,
      SK: `RESUME#${application.resumeId}#EXTRACTION#${application.updatedAt}`,
      entityType: "resumeExtraction",
      resumeId: application.resumeId,
      parsedAt: application.updatedAt,
      normalized: JSON.stringify({
        name: application.candidateEmail?.split("@")[0].replace(/[._]/g, " "),
        email: application.candidateEmail,
        phone: "+91 98765 43210",
        skills: application.matchedSkills ?? [],
      }),
      rawText: "PROJECTS\nAI Hiring Platform — Built recruiter dashboards, candidate scoring, and role-based workflows.\nResume Intelligence — Created a PDF parsing and skill-matching pipeline.\nEXPERIENCE\nSoftware Engineer",
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
    };

    return [applicationRecord, analysisRecord, extractionRecord];
  });
}

export function shouldUseDemoFallback(error: unknown): boolean {
  if (getDemoSession()) {
    return true;
  }

  const status = (error as { response?: { status?: number } })?.response?.status;
  const hasResponse = Boolean(
    (error as { response?: unknown })?.response
  );

  if (!hasResponse) {
    return true;
  }

  return status === 404 || (typeof status === "number" && status >= 500);
}
