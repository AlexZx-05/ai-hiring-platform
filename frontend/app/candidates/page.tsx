"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Search,
  Sparkles,
  UserCheck,
  Users,
} from "lucide-react";
import {
  listJobApplications,
  listRecruiterJobs,
  type RecruiterApplication,
} from "@/services/recruiter";
import { compareApplications, getMatchStrength, getScreeningLabel } from "@/lib/screening";

type CandidateLeaderboardEntry = RecruiterApplication & {
  jobTitle: string;
};

const statusStyle: Record<RecruiterApplication["status"], string> = {
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

function getErrorMessage(error: unknown): string {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ?? "Unable to load candidates."
  );
}

export default function CandidatesPage() {
  const [entries, setEntries] = useState<CandidateLeaderboardEntry[]>([]);
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
        const applicationSets = await Promise.all(
          jobs.map(async (job) => {
            const applications = await listJobApplications(job.jobId);
            return applications.map((application) => ({
              ...application,
              jobTitle: job.title,
            }));
          })
        );

        if (!active) {
          return;
        }

        setEntries(applicationSets.flat().sort(compareApplications));
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(getErrorMessage(loadError));
        setEntries([]);
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

  const filteredEntries = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return entries;
    }

    return entries.filter((entry) =>
      [
        entry.candidateEmail,
        entry.candidateId,
        entry.jobTitle,
        ...(entry.matchedSkills ?? []),
        ...(entry.missingSkills ?? []),
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }, [entries, query]);

  const summary = useMemo(() => {
    const scored = entries.filter((entry) => typeof entry.atsScore === "number");

    return {
      totalCandidates: new Set(entries.map((entry) => entry.candidateId)).size,
      shortlisted: entries.filter((entry) => entry.status === "SHORTLISTED").length,
      awaitingAi: entries.filter((entry) => typeof entry.atsScore !== "number").length,
      averageScore: scored.length
        ? Math.round(
            scored.reduce((sum, entry) => sum + (entry.atsScore ?? 0), 0) / scored.length
          )
        : null,
    };
  }, [entries]);

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-5">
          <Link
            href="/dashboard"
            className="mb-4 flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to dashboard
          </Link>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-slate-900">Candidate Directory</h1>
                  <p className="text-sm text-slate-500">
                    Review every applicant across recruiter jobs from one screen.
                  </p>
                </div>
              </div>
            </div>

            <label className="relative block w-full lg:w-80">
              <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by candidate, job, or skill"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-6 px-5 py-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Unique candidates" value={summary.totalCandidates} icon={Users} />
          <SummaryCard label="Shortlisted profiles" value={summary.shortlisted} icon={UserCheck} />
          <SummaryCard
            label="Avg. AI score"
            value={summary.averageScore === null ? "Pending" : `${summary.averageScore}%`}
            icon={Sparkles}
          />
          <SummaryCard label="Awaiting AI review" value={summary.awaitingAi} icon={BriefcaseBusiness} />
        </div>

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-900">Candidate leaderboard</h2>
            <p className="mt-1 text-xs text-slate-500">
              Candidates are ordered by AI score when available, then by recruiter stage and most recent activity.
            </p>
          </div>

          {loading ? (
            <div className="px-5 py-8 text-sm text-slate-500">Loading candidates...</div>
          ) : filteredEntries.length ? (
            <div className="divide-y divide-slate-100">
              {filteredEntries.map((entry) => (
                <div
                  key={entry.applicationId}
                  className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1.1fr)_180px_180px_180px]"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/recruiter/candidates/${entry.candidateId}`}
                        className="truncate text-sm font-semibold text-slate-900 hover:text-blue-700"
                      >
                        {entry.candidateEmail ?? entry.candidateId}
                      </Link>
                      <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${statusStyle[entry.status]}`}>
                        {entry.status.replaceAll("_", " ")}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {entry.jobTitle} · Resume {entry.resumeId}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(entry.matchedSkills?.length ? entry.matchedSkills : ["AI review pending"]).slice(0, 4).map((skill) => (
                        <span
                          key={`${entry.applicationId}-${skill}`}
                          className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <MetricCell
                    label="Screening"
                    value={getScreeningLabel(entry)}
                    tone={typeof entry.atsScore === "number" ? "text-slate-900" : "text-amber-700"}
                  />
                  <MetricCell label="Match strength" value={getMatchStrength(entry)} tone="text-slate-900" />
                  <div className="flex items-center justify-between gap-3 lg:justify-end">
                    <div className="text-right">
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">Next step</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {entry.status === "SHORTLISTED" ? "Interview shortlist" : "Review application"}
                      </p>
                    </div>
                    <Link
                      href={`/recruiter/jobs/${entry.jobId}`}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Open Job Review
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-10 text-center">
              <Users className="mx-auto h-6 w-6 text-slate-300" />
              <p className="mt-3 text-sm font-medium text-slate-900">No candidates found</p>
              <p className="mt-1 text-xs text-slate-500">
                Applicants will appear here after candidates submit to open recruiter jobs.
              </p>
            </div>
          )}
        </section>
      </section>
    </main>
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
  value: string;
  tone: string;
}) {
  return (
    <div className="flex flex-col justify-center">
      <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`text-sm font-semibold ${tone}`}>{value}</p>
    </div>
  );
}
