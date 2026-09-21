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

  const jobById = useMemo(
    () => new Map(jobs.map((job) => [job.jobId, job])),
    [jobs]
  );

  return (
    <WorkspaceShell
      title="My Applications"
      subtitle="Track where every application stands after resume upload and AI screening."
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
          <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
            <div className="grid grid-cols-[1fr_150px_180px] border-b border-gray-100 px-4 py-3 text-xs font-semibold text-gray-500">
              <span>Application</span>
              <span>Status</span>
              <span>Submitted</span>
            </div>
            {applications.map((application) => {
              const job = jobById.get(application.jobId);

              return (
              <div
                key={application.applicationId}
                className="grid grid-cols-[1fr_150px_180px] items-center border-b border-gray-50 px-4 py-4 last:border-0"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 flex-shrink-0 text-gray-400" />
                    <Link
                      href={`/jobs/${application.jobId}`}
                      className="truncate text-sm font-medium text-gray-900 hover:text-blue-700"
                    >
                      {job?.title ?? `Job ${application.jobId}`}
                    </Link>
                  </div>
                  <p className="mt-1 truncate text-xs text-gray-500">
                    {job ? `${job.department} · ${job.location}` : `Resume ${application.resumeId}`}
                  </p>
                  {application.processingError ? <p className="mt-1 text-xs text-rose-600">Resume processing error: {application.processingError}</p> : null}
                </div>
                <span className={`w-fit rounded-full px-2 py-1 text-[11px] font-semibold ${statusStyles[application.status]}`}>
                  {application.status.replace("_", " ")}
                </span>
                <p className="mt-2 max-w-xs text-[11px] leading-4 text-gray-500">
                  {statusGuidance[application.status]}
                </p>
                <span className="text-xs text-gray-500">
                  {new Date(application.createdAt).toLocaleString()}
                </span>
              </div>
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
