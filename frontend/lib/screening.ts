import type { RecruiterApplication } from "@/services/recruiter";

export function compareApplications(
  left: RecruiterApplication,
  right: RecruiterApplication
): number {
  const leftScore = left.atsScore ?? -1;
  const rightScore = right.atsScore ?? -1;

  if (leftScore !== rightScore) {
    return rightScore - leftScore;
  }

  const applicationDateOrder = Date.parse(left.createdAt) - Date.parse(right.createdAt);
  if (Number.isFinite(applicationDateOrder) && applicationDateOrder !== 0) {
    return applicationDateOrder;
  }

  return left.applicationId.localeCompare(right.applicationId);
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
