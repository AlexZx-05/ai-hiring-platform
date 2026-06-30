"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Briefcase, FileText, RefreshCcw } from "lucide-react";
import { listApplications, type Application } from "@/services/jobs";

const statusStyles: Record<Application["status"], string> = {
  SUBMITTED: "bg-blue-50 text-blue-700",
  PARSING: "bg-amber-50 text-amber-700",
  UNDER_REVIEW: "bg-indigo-50 text-indigo-700",
  SHORTLISTED: "bg-green-50 text-green-700",
  REJECTED: "bg-rose-50 text-rose-700",
};

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadApplications = () => {
    setLoading(true);
    setError(null);
    listApplications()
      .then(setApplications)
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

  return (
    <main className="min-h-screen bg-gray-50">
      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
          <div>
            <Link href="/jobs" className="mb-3 flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-900">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to jobs
            </Link>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-700">
                <FileText className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">My Applications</h1>
                <p className="text-xs text-gray-500">Track your submitted job applications.</p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={loadApplications}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-6">
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
            {applications.map((application) => (
              <div
                key={application.applicationId}
                className="grid grid-cols-[1fr_150px_180px] items-center border-b border-gray-50 px-4 py-4 last:border-0"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 flex-shrink-0 text-gray-400" />
                    <p className="truncate text-sm font-medium text-gray-900">
                      Job {application.jobId}
                    </p>
                  </div>
                  <p className="mt-1 truncate text-xs text-gray-500">
                    Resume {application.resumeId}
                  </p>
                </div>
                <span className={`w-fit rounded-full px-2 py-1 text-[11px] font-semibold ${statusStyles[application.status]}`}>
                  {application.status.replace("_", " ")}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(application.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
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
      </section>
    </main>
  );
}
