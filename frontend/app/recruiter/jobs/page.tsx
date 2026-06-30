"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Briefcase, CalendarDays, MapPin, Plus, Users } from "lucide-react";
import { listRecruiterJobs } from "@/services/recruiter";
import type { Job } from "@/services/jobs";

export default function RecruiterJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listRecruiterJobs()
      .then(setJobs)
      .catch((err) => {
        setError(
          (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message ?? "Unable to load recruiter jobs."
        );
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-gray-50">
      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-700">
              <Briefcase className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Recruiter Jobs</h1>
              <p className="text-xs text-gray-500">Manage postings and review applicants.</p>
            </div>
          </div>
          <Link
            href="/recruiter/jobs/create"
            className="flex items-center gap-2 rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800"
          >
            <Plus className="h-3.5 w-3.5" />
            New Job
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-6">
        {error ? (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-xl border border-gray-100 bg-white p-6 text-sm text-gray-500">
            Loading jobs...
          </div>
        ) : jobs.length ? (
          <div className="grid gap-3">
            {jobs.map((job) => (
              <Link
                key={job.jobId}
                href={`/recruiter/jobs/${job.jobId}`}
                className="rounded-xl border border-gray-100 bg-white p-4 transition hover:border-blue-200 hover:shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-gray-900">{job.title}</h2>
                      <span className="rounded-full bg-green-50 px-2 py-1 text-[10px] font-semibold text-green-700">
                        {job.status}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                      <span>{job.department}</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {job.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {new Date(job.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <span className="flex items-center gap-2 text-xs font-semibold text-blue-700">
                    <Users className="h-4 w-4" />
                    View applicants
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-gray-100 bg-white p-8 text-center">
            <Briefcase className="mx-auto h-6 w-6 text-gray-400" />
            <p className="mt-3 text-sm font-medium text-gray-900">No jobs posted yet</p>
            <Link
              href="/recruiter/jobs/create"
              className="mt-4 inline-flex rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800"
            >
              Create Job
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
