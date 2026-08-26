"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Briefcase,
  Building2,
  Clock3,
  MapPin,
  Search,
  Sparkles,
} from "lucide-react";
import { listJobs, type Job } from "@/services/jobs";
import WorkspaceShell from "@/components/workspace/WorkspaceShell";

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [source, setSource] = useState<"api" | "demo">("api");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    listJobs()
      .then((result) => {
        if (!mounted) return;
        setJobs(result.jobs);
        setSource(result.source);
      })
      .catch((err) => {
        if (!mounted) return;
        const message =
          (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message ?? "Unable to load jobs.";
        setError(message);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filteredJobs = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return jobs;

    return jobs.filter((job) =>
      [job.title, job.department, job.location, ...job.skills]
        .join(" ")
        .toLowerCase()
        .includes(text)
    );
  }, [jobs, query]);

  return (
    <WorkspaceShell
      title="Open Jobs"
      subtitle="Browse recruiter-posted roles and apply from the same candidate workspace."
      actions={
        <Link
          href="/applications"
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          My Applications
        </Link>
      }
    >
        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_220px]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="Search by title, skill, or location"
            />
          </label>
          <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600">
            {filteredJobs.length} active roles
          </div>
        </div>

        {source === "demo" ? (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Showing sample jobs because the jobs API route is not deployed yet.
          </div>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-xl border border-gray-100 bg-white p-6 text-sm text-gray-500">
            Loading jobs...
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredJobs.map((job) => (
              <Link
                key={job.jobId}
                href={`/jobs/${job.jobId}`}
                className="rounded-xl border border-gray-100 bg-white p-4 transition hover:border-blue-200 hover:shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-gray-900">{job.title}</h2>
                      <span className="rounded-full bg-green-50 px-2 py-1 text-[10px] font-semibold text-green-700">
                        {job.status}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5" />
                        {job.department}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {job.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock3 className="h-3.5 w-3.5" />
                        {job.experienceLevel}
                      </span>
                    </div>
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
                      {job.description}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {job.skills.slice(0, 6).map((skill) => (
                        <span
                          key={skill}
                          className="rounded-md bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-blue-700">
                    View role
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </Link>
            ))}

            {!filteredJobs.length ? (
              <div className="rounded-xl border border-gray-100 bg-white p-6 text-center">
                <Sparkles className="mx-auto h-5 w-5 text-gray-400" />
                <p className="mt-2 text-sm font-medium text-gray-900">No matching jobs</p>
                <p className="mt-1 text-xs text-gray-500">Try another search term.</p>
              </div>
            ) : null}
          </div>
        )}
    </WorkspaceShell>
  );
}
