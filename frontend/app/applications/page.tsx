"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Briefcase, FileText, RefreshCcw } from "lucide-react";
import { listApplications, listJobs, type Application, type Job } from "@/services/jobs";
import WorkspaceShell from "@/components/workspace/WorkspaceShell";

const statusStyles: Record<Application["status"], string> = {
  APPLIED: "bg-blue-50 text-blue-700",
  PARSING: "bg-amber-50 text-amber-700",
  AI_REVIEWED: "bg-cyan-50 text-cyan-700",
  UNDER_REVIEW: "bg-indigo-50 text-indigo-700",
  SHORTLISTED: "bg-green-50 text-green-700",
  INTERVIEW_RECOMMENDED: "bg-violet-50 text-violet-700",
  INTERVIEW_SCHEDULED: "bg-violet-50 text-violet-700",
  OFFER: "bg-emerald-50 text-emerald-700",
  HIRED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-rose-50 text-rose-700",
};

const statusGuidance: Record<Application["status"], string> = {
  APPLIED: "Received — your application is queued for secure processing.",
  PARSING: "Your resume is being read and prepared for job-specific screening.",
  AI_REVIEWED: "Screening is complete and the hiring team can now review your profile.",
  UNDER_REVIEW: "A recruiter is reviewing your experience and application responses.",
  SHORTLISTED: "You are on the recruiter’s shortlist for this role.",
  INTERVIEW_RECOMMENDED: "The team would like to move forward; expect a scheduling update.",
  INTERVIEW_SCHEDULED: "Your interview has been scheduled. Check your recruiter communication for details.",
  OFFER: "The hiring team has shared an offer update with you.",
  HIRED: "Congratulations — this application is marked as hired.",
  REJECTED: "The team has closed this application. Thank you for your time and interest.",
};

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasPendingProcessing = applications.some(
    (application) => application.status === "PARSING" && !application.processingError
  );

  const loadApplications = () => {
    setLoading(true);
    setError(null);
    Promise.all([listApplications(), listJobs()])
      .then(([applicationItems, jobsResult]) => {
        setApplications(applicationItems);
        setJobs(jobsResult.jobs);
      })
      .catch((err) => {
        const message =
          (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message ?? "Unable to load applications.";
        setError(message);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadApplications();
  }, []);

  useEffect(() => {
    if (!hasPendingProcessing) return;

    let active = true;
    const interval = window.setInterval(() => {
      listApplications()
        .then((applicationItems) => {
          if (active) setApplications(applicationItems);
        })
        .catch((err) => {
          if (!active) return;
          const message =
            (err as { response?: { data?: { message?: string } } })?.response?.data
              ?.message ?? "Unable to refresh application status.";
          setError(message);
        });
    }, 10_000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [hasPendingProcessing]);

  const jobById = useMemo(
    () => new Map(jobs.map((job) => [job.jobId, job])),
    [jobs]
  );

  return (
    <WorkspaceShell
      title="My Applications"
      subtitle="Track each application after resume upload and AI screening. Pending applications refresh automatically."
      actions={
        <button
          type="button"
          onClick={loadApplications}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <RefreshCcw className="h-3.5 w-3.5" />
          Refresh
        </button>
      }
    >
        {error ? (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-xl border border-gray-100 bg-white p-6 text-sm text-gray-500">
            Loading applications...
          </div>
        ) : applications.length ? (
          <div className="space-y-4">
            {applications.map((application) => {
              const job = jobById.get(application.jobId);

              return (
              <article
                key={application.applicationId}
                className="rounded-xl border border-gray-100 bg-white p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 flex-shrink-0 text-gray-400" />
                      <Link
                        href={`/jobs/${application.jobId}`}
                        className="truncate text-sm font-semibold text-gray-900 hover:text-blue-700"
                      >
                        {job?.title ?? `Job ${application.jobId}`}
                      </Link>
                    </div>
                    <p className="mt-1 truncate text-xs text-gray-500">
                      {job ? `${job.department} · ${job.location}` : `Resume ${application.resumeId}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {typeof application.atsScore === "number" ? (
                      <span className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-800">
                        Match {Math.round(application.atsScore)}/100
                      </span>
                    ) : null}
                    <span className={`w-fit rounded-full px-2 py-1 text-[11px] font-semibold ${statusStyles[application.status]}`}>
                      {application.status.replace("_", " ")}
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs leading-5 text-gray-500">
                  {statusGuidance[application.status]}
                  </p>
                  <span className="text-xs text-gray-500">
                    Applied {new Date(application.createdAt).toLocaleString()}
                  </span>
                </div>
                {application.processingError ? (
                  <p className="mt-3 rounded-lg bg-rose-50 p-3 text-xs text-rose-700">
                    Resume processing error: {application.processingError}
                  </p>
                ) : null}
                {typeof application.atsScore === "number" ? (
                  <CandidateReviewReport application={application} />
                ) : null}
              </article>
            )})}
          </div>
        ) : (
          <div className="rounded-xl border border-gray-100 bg-white p-8 text-center">
            <FileText className="mx-auto h-6 w-6 text-gray-400" />
            <p className="mt-3 text-sm font-medium text-gray-900">No applications yet</p>
            <p className="mt-1 text-xs text-gray-500">Apply to an open role to start tracking.</p>
            <Link
              href="/jobs"
              className="mt-4 inline-flex rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800"
            >
              Browse Jobs
            </Link>
          </div>
        )}
    </WorkspaceShell>
  );
}

function CandidateReviewReport({ application }: { application: Application }) {
  const breakdown = application.scoreBreakdown;
  const evidenceLabels = {
    SUPPORTED: "Evidenced",
    PARTIAL: "Partially evidenced",
    NOT_FOUND: "Not clearly evidenced",
  } as const;

  return (
    <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50">
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-800">
        Your review report
        {application.analyzedAt ? (
          <span className="ml-2 font-normal text-slate-500">
            · {new Date(application.analyzedAt).toLocaleString()}
          </span>
        ) : null}
      </summary>
      <div className="space-y-5 border-t border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Resume-to-role match</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{Math.round(application.atsScore ?? 0)}/100</p>
          </div>
          {typeof application.confidence === "number" ? (
            <p className="text-xs text-slate-600">AI confidence {Math.round(application.confidence * 100)}%</p>
          ) : null}
        </div>
        {application.applicationRecommendation ? (
          <section className="rounded-lg border border-indigo-100 bg-indigo-50 p-3">
            <h3 className="text-xs font-semibold text-indigo-950">
              Advisory next step: {application.applicationRecommendation.label === "Consider applying"
                ? "Good evidence to discuss"
                : application.applicationRecommendation.label}
            </h3>
            <p className="mt-1 text-sm leading-5 text-indigo-900">
              {application.applicationRecommendation.rationale}
            </p>
          </section>
        ) : null}
        {application.summary ? (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Professional summary</h3>
            <p className="mt-2 text-sm leading-6 text-slate-700">{application.summary}</p>
          </section>
        ) : null}
        {breakdown ? (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Match by dimension</h3>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {([
                ["Required skills", breakdown.requiredSkills],
                ["Responsibilities", breakdown.responsibilities],
                ["Relevant experience", breakdown.relevantExperience],
              ] as const).map(([label, score]) => (
                <div key={label} className="rounded-lg bg-white p-3">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{Math.round(Number(score))}/100</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          {application.strengths?.length ? (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Relevant strengths</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-5 text-slate-700">
                {application.strengths.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </section>
          ) : null}
          {application.improvementTips?.length ? (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Ways to strengthen your resume</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-5 text-slate-700">
                {application.improvementTips.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </section>
          ) : null}
        </div>
        {application.matchedSkills?.length || application.missingSkills?.length ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {([
              { heading: "Skills evidenced", items: application.matchedSkills ?? [] },
              { heading: "Role criteria not clearly evidenced", items: application.missingSkills ?? [] },
            ]).map(({ heading, items }) => (
              <section key={heading}>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">{heading}</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {items.length ? items.map((skill) => (
                    <span key={skill} className="rounded-md bg-white px-2 py-1 text-xs text-slate-700">{skill}</span>
                  )) : <p className="text-sm text-slate-500">None listed.</p>}
                </div>
              </section>
            ))}
          </div>
        ) : null}
        {application.evidence?.length ? (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Evidence against role requirements</h3>
            <ul className="mt-2 divide-y divide-slate-200">
              {application.evidence.map((item, index) => (
                <li key={`${item.criterion}-${index}`} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-800">{item.criterion}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-white px-2 py-1 text-[10px] font-medium text-slate-500">
                        {item.source === "SCREENING_RESPONSE" ? "Your response" : "Resume"}
                      </span>
                      <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-slate-600">
                        {evidenceLabels[item.status]}
                      </span>
                    </div>
                  </div>
                  {item.resumeEvidence ? (
                    <blockquote className="mt-2 border-l-2 border-slate-300 pl-3 text-xs leading-5 text-slate-600">
                      “{item.resumeEvidence}”
                    </blockquote>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <p className="text-xs leading-5 text-slate-500">
          This is an advisory comparison, not a hiring decision. “Not clearly evidenced” means the document did not clearly show that criterion; it does not mean you lack that skill.
        </p>
      </div>
    </details>
  );
}
