import type { RecruiterApplication } from "@/services/recruiter";

const statusWeight: Record<RecruiterApplication["status"], number> = {
  HIRED: 9,
  OFFER: 8,
  INTERVIEW_SCHEDULED: 7,
  INTERVIEW_RECOMMENDED: 6,
  SHORTLISTED: 5,
  UNDER_REVIEW: 4,
  AI_REVIEWED: 3,
  APPLIED: 2,
  PARSING: 1,
  REJECTED: 0,
};

export function compareApplications(
  left: RecruiterApplication,
  right: RecruiterApplication
): number {
  const leftScore = left.atsScore ?? -1;
  const rightScore = right.atsScore ?? -1;

  if (leftScore !== rightScore) {
    return rightScore - leftScore;
  }

  const leftWeight = statusWeight[left.status];
  const rightWeight = statusWeight[right.status];
  if (leftWeight !== rightWeight) {
    return rightWeight - leftWeight;
  }

  return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
}

export function getScreeningLabel(application: RecruiterApplication): string {
  if (typeof application.atsScore === "number") {
    return `${application.atsScore}% match`;
  }

  if (application.status === "PARSING") {
    return "Resume parsing";
  }

  if (application.status === "APPLIED" || application.status === "AI_REVIEWED") {
    return "Awaiting AI review";
  }

  if (application.status === "UNDER_REVIEW") {
    return "Manual review";
  }

  if (application.status === "SHORTLISTED") {
    return "Shortlisted";
  }

  return "Closed";
}

export function getMatchStrength(application: RecruiterApplication): string {
  if (typeof application.atsScore !== "number") {
    return "Pending";
  }

  if (application.atsScore >= 85) {
    return "Strong";
  }
  if (application.atsScore >= 70) {
    return "Promising";
  }
  if (application.atsScore >= 55) {
    return "Borderline";
  }

  return "Weak";
}
