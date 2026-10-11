"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  Search,
  Sparkles,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import WorkspaceShell from "@/components/workspace/WorkspaceShell";
import {
  listJobApplications,
  listRecruiterJobs,
  type RecruiterApplication,
} from "@/services/recruiter";
import type { Job } from "@/services/jobs";
import { isSelectedForNextStage } from "@/lib/screening";

type JobApplicantGroup = {
  job: Job;
  applications: RecruiterApplication[];
};

function getErrorMessage(error: unknown): string {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ?? "Unable to load jobs and applicants."
  );
}

export default function CandidatesPage() {
  const [groups, setGroups] = useState<JobApplicantGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const jobs = await listRecruiterJobs();
        const loadedGroups = await Promise.all(
          jobs.map(async (job) => ({
            job,
            applications: await listJobApplications(job.jobId),
          }))
        );

        if (active) {
          setGroups(loadedGroups);
        }
      } catch (loadError) {
        if (active) {
          setError(getErrorMessage(loadError));
          setGroups([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  const allApplications = useMemo(
    () => groups.flatMap(({ applications }) => applications),
    [groups]
  );

  const filteredGroups = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return groups;

    return groups.filter(({ job, applications }) =>
      [
        job.title,
        job.department,
        job.location,
        ...applications.flatMap((application) => [
          application.candidateEmail,
          application.candidateId,
          ...(application.matchedSkills ?? []),
          ...(application.missingSkills ?? []),
        ]),
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }, [groups, query]);

  const scoredApplications = allApplications.filter(
    (application) => typeof application.atsScore === "number"
  );
  const summary = {
    totalCandidates: new Set(allApplications.map((application) => application.candidateId)).size,
    selected: allApplications.filter(isSelectedForNextStage).length,
    rejected: allApplications.filter((application) => application.status === "REJECTED").length,
    awaitingAi: allApplications.filter((application) => typeof application.atsScore !== "number").length,
    averageScore: scoredApplications.length
      ? Math.round(
          scoredApplications.reduce((sum, application) => sum + (application.atsScore ?? 0), 0) /
            scoredApplications.length
        )
      : null,
  };

  return (
    <WorkspaceShell
      title="Candidate directory"
      subtitle="Choose a job to review its applicants, shortlist, and rejections."
      actions={
        <label className="relative block w-56 sm:w-80">
          <span className="sr-only">Search jobs or applicants</span>
          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Job, candidate, or skill"
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
      }
    >
      <section className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <SummaryCard label="Unique candidates" value={summary.totalCandidates} icon={Users} />
          <SummaryCard label="Selected / advanced" value={summary.selected} icon={UserCheck} />
          <SummaryCard label="Rejected" value={summary.rejected} icon={XCircle} />
          <SummaryCard
            label="Average AI score"
            value={summary.averageScore === null ? "Pending" : `${summary.averageScore}%`}
            icon={Sparkles}
          />
          <SummaryCard label="Awaiting AI review" value={summary.awaitingAi} icon={BriefcaseBusiness} />
        </div>

        {error ? (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-900">Jobs and applicant status</h2>
            <p className="mt-1 text-xs text-slate-500">
              Select a job to review every applicant, view their evidence, and prepare recruiter-approved email drafts.
            </p>
          </div>

          {loading ? (
            <div className="px-5 py-8 text-sm text-slate-500">Loading jobs and applicants...</div>
          ) : filteredGroups.length ? (
            <div className="divide-y divide-slate-100">
              {filteredGroups.map(({ job, applications }) => {
                const selectedCount = applications.filter(isSelectedForNextStage).length;
                const rejectedCount = applications.filter((application) => application.status === "REJECTED").length;
                const pendingCount = applications.filter((application) => typeof application.atsScore !== "number").length;

                return (
                  <div
                    key={job.jobId}
                    className="grid gap-4 px-5 py-4 md:grid-cols-[minmax(0,1fr)_repeat(4,minmax(100px,140px))_auto] md:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <BriefcaseBusiness className="h-4 w-4 flex-shrink-0 text-blue-700" />
                        <h3 className="truncate text-sm font-semibold text-slate-900">{job.title}</h3>
                      </div>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {job.department} · {job.location} · {job.status}
                      </p>
                    </div>
                    <MetricCell label="Applicants" value={applications.length} tone="text-slate-900" />
                    <MetricCell label="Selected / advanced" value={selectedCount} tone="text-emerald-700" />
                    <MetricCell label="Rejected" value={rejectedCount} tone="text-rose-700" />
                    <MetricCell label="AI review pending" value={pendingCount} tone="text-amber-700" />
                    <Link
                      href={`/recruiter/jobs/${job.jobId}`}
                      className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Review applicants
                    </Link>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-5 py-10 text-center">
              <Users className="mx-auto h-6 w-6 text-slate-300" />
              <p className="mt-3 text-sm font-medium text-slate-900">
                {groups.length ? "No matching jobs or applicants" : "No jobs found"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Create or publish a job to see its applicants here.
              </p>
            </div>
          )}
        </section>
      </section>
    </WorkspaceShell>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  icon: typeof Users;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-4 text-2xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </article>
  );
}

function MetricCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${tone}`}>{value}</p>
    </div>
  );
}
