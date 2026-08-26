"use client";

import Link from "next/link";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BarChart2, BriefcaseBusiness, Search, Sparkles, Trophy } from "lucide-react";
import {
  listJobApplications,
  listRecruiterJobs,
  type RecruiterApplication,
} from "@/services/recruiter";
import { compareApplications, getMatchStrength, getScreeningLabel } from "@/lib/screening";

type RankedEntry = RecruiterApplication & {
  jobTitle: string;
};

export default function RankingsPage() {
  const [entries, setEntries] = useState<RankedEntry[]>([]);
  const [selectedJob, setSelectedJob] = useState("ALL");
  const [query, setQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [minimumScore, setMinimumScore] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

        setError(
          (loadError as { response?: { data?: { message?: string } } })?.response?.data
            ?.message ?? "Unable to load rankings."
        );
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

  const jobs = useMemo(() => {
    return Array.from(
      new Map(entries.map((entry) => [entry.jobId, entry.jobTitle])).entries()
    );
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const scoreFloor = minimumScore === "ALL" ? null : Number(minimumScore);

    return entries.filter((entry) => {
      const matchesJob = selectedJob === "ALL" || entry.jobId === selectedJob;
      const matchesStatus = selectedStatus === "ALL" || entry.status === selectedStatus;
      const matchesScore =
        scoreFloor === null ||
        (typeof entry.atsScore === "number" && entry.atsScore >= scoreFloor);
      const matchesQuery =
        !normalizedQuery ||
        [
          entry.candidateEmail,
          entry.candidateId,
          entry.jobTitle,
          ...(entry.matchedSkills ?? []),
          ...(entry.missingSkills ?? []),
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesJob && matchesStatus && matchesScore && matchesQuery;
    });
  }, [entries, minimumScore, query, selectedJob, selectedStatus]);

  const topThree = filteredEntries.slice(0, 3);
  const scoredEntries = filteredEntries.filter((entry) => typeof entry.atsScore === "number");

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-6">
      <section className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <Link
            href="/dashboard"
            className="mb-5 flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to dashboard
          </Link>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
                <BarChart2 className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-900">Candidate Rankings</h1>
                <p className="text-sm text-slate-500">
                  Compare applicants by AI score when available, then recruiter review state.
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label className="relative block md:col-span-2 xl:col-span-1">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Search
                </span>
                <Search className="pointer-events-none absolute bottom-3.5 left-3 h-4 w-4 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Candidate or skill"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <FilterSelect label="Job" value={selectedJob} onChange={setSelectedJob}>
                <option value="ALL">All jobs</option>
                {jobs.map(([jobId, title]) => (
                  <option key={jobId} value={jobId}>
                    {title}
                  </option>
                ))}
              </FilterSelect>
              <FilterSelect label="Status" value={selectedStatus} onChange={setSelectedStatus}>
                <option value="ALL">All statuses</option>
                <option value="SHORTLISTED">Shortlisted</option>
                <option value="UNDER_REVIEW">Under review</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="PARSING">Parsing</option>
                <option value="REJECTED">Rejected</option>
              </FilterSelect>
              <FilterSelect label="Score" value={minimumScore} onChange={setMinimumScore}>
                <option value="ALL">Any score</option>
                <option value="85">85% and above</option>
                <option value="70">70% and above</option>
                <option value="55">55% and above</option>
              </FilterSelect>
            </div>
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-3">
          <HighlightCard
            icon={Trophy}
            label="Top ranked"
            value={topThree[0]?.candidateEmail ?? "No data"}
            detail={topThree[0] ? `${topThree[0].jobTitle} · ${getScreeningLabel(topThree[0])}` : "Candidates will appear after applications arrive."}
          />
          <HighlightCard
            icon={Sparkles}
            label="Average AI score"
            value={
              scoredEntries.length
                ? `${Math.round(scoredEntries.reduce((sum, entry) => sum + (entry.atsScore ?? 0), 0) / scoredEntries.length)}%`
                : "Pending"
            }
            detail="Shown only when resume analysis results exist."
          />
          <HighlightCard
            icon={BriefcaseBusiness}
            label="Applicants in view"
            value={String(filteredEntries.length)}
            detail={selectedJob === "ALL" ? "Across all recruiter jobs" : "For the selected job"}
          />
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-900">Leaderboard</h2>
            <p className="mt-1 text-xs text-slate-500">
              If the Grok-backed scoring API is not connected yet, candidates stay visible here with manual-review priority.
            </p>
          </div>

          {loading ? (
            <div className="px-5 py-8 text-sm text-slate-500">Loading rankings...</div>
          ) : filteredEntries.length ? (
            <div className="divide-y divide-slate-100">
              {filteredEntries.map((entry, index) => (
                <div
                  key={entry.applicationId}
                  className="grid gap-4 px-5 py-4 lg:grid-cols-[80px_minmax(0,1.2fr)_180px_180px_160px]"
                >
                  <div className="flex items-center">
                    <div className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white">
                      #{index + 1}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <Link
                      href={`/recruiter/candidates/${entry.candidateId}`}
                      className="truncate text-sm font-semibold text-slate-900 hover:text-blue-700"
                    >
                      {entry.candidateEmail ?? entry.candidateId}
                    </Link>
                    <p className="mt-1 truncate text-xs text-slate-500">{entry.jobTitle}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(entry.matchedSkills?.length ? entry.matchedSkills : ["Awaiting AI skills extraction"]).slice(0, 4).map((skill) => (
                        <span
                          key={`${entry.applicationId}-${skill}`}
                          className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <RankingMetric
                    label="Screening"
                    value={getScreeningLabel(entry)}
                    tone={typeof entry.atsScore === "number" ? "text-slate-900" : "text-amber-700"}
                  />
                  <RankingMetric label="Match strength" value={getMatchStrength(entry)} tone="text-slate-900" />
                  <div className="flex items-center justify-between gap-3 lg:justify-end">
                    <Link
                      href={`/recruiter/jobs/${entry.jobId}`}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Review
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-10 text-center">
              <BarChart2 className="mx-auto h-6 w-6 text-slate-300" />
              <p className="mt-3 text-sm font-medium text-slate-900">No ranking data yet</p>
              <p className="mt-1 text-xs text-slate-500">
                Publish jobs and collect applications to build the leaderboard.
              </p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function HighlightCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Trophy;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </article>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      >
        {children}
      </select>
    </label>
  );
}

function RankingMetric({
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
