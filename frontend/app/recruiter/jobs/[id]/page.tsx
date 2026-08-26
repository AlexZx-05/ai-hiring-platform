"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CheckCircle2,
  FileText,
  MapPin,
  RefreshCcw,
  ExternalLink,
  Copy,
  Sparkles,
  UserCheck,
  XCircle,
} from "lucide-react";
import { getJob, type Job } from "@/services/jobs";
import {
  getResumeDownloadUrl,
  listJobApplications,
  updateApplicationStatus,
  type RecruiterApplication,
} from "@/services/recruiter";
import { compareApplications, getMatchStrength, getScreeningLabel } from "@/lib/screening";

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

function getErrorMessage(error: unknown, fallback: string): string {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ?? fallback
  );
}

export default function RecruiterJobApplicantsPage() {
  const params = useParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<RecruiterApplication[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!params.id) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [jobResult, applicationItems] = await Promise.all([
        getJob(params.id),
        listJobApplications(params.id),
      ]);

      setJob(jobResult.job);
      setApplications(applicationItems);
      setNotes(
        Object.fromEntries(
          applicationItems.map((application) => [
            application.applicationId,
            application.recruiterNote ?? "",
          ])
        )
      );
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Unable to load applications."));
    } finally {
      setLoading(false);
    }
  };

  const onViewResume = async (application: RecruiterApplication) => {
    setError(null);
    setDownloadingId(application.applicationId);
    try {
      const result = await getResumeDownloadUrl({
        applicationId: application.applicationId,
        candidateId: application.candidateId,
      });
      window.open(result.downloadUrl, "_blank", "noopener,noreferrer");
    } catch (downloadError) {
      setError(getErrorMessage(downloadError, "Unable to open resume."));
    } finally {
      setDownloadingId(null);
    }
  };

  useEffect(() => {
    void load();
  }, [params.id]);

  const onStatus = async (
    application: RecruiterApplication,
    status: RecruiterApplication["status"]
  ) => {
    setError(null);
    setUpdatingId(application.applicationId);
    try {
      const updated = await updateApplicationStatus({
        applicationId: application.applicationId,
        candidateId: application.candidateId,
        status,
        recruiterNote: notes[application.applicationId]?.trim() || undefined,
      });

      setApplications((current) =>
        current
          .map((item) =>
            item.applicationId === updated.applicationId
              ? { ...item, ...updated }
              : item
          )
          .sort(compareApplications)
      );
      setNotes((current) => ({
        ...current,
        [application.applicationId]: updated.recruiterNote ?? current[application.applicationId] ?? "",
      }));
    } catch (updateError) {
      setError(getErrorMessage(updateError, "Unable to update status."));
    } finally {
      setUpdatingId(null);
    }
  };

  const ranked = useMemo(() => [...applications].sort(compareApplications), [applications]);
  const scoredApplications = ranked.filter((application) => typeof application.atsScore === "number");
  const shortlistCount = ranked.filter((application) => application.status === "SHORTLISTED").length;
  const publicJobUrl = job?.publicTenantSlug && job.publicSlug && typeof window !== "undefined"
    ? `${window.location.origin}/careers/${job.publicTenantSlug}/${job.publicSlug}`
    : null;
  const copyJobLink = async () => {
    if (publicJobUrl) await navigator.clipboard.writeText(publicJobUrl);
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-5">
          <Link
            href="/recruiter/jobs"
            className="mb-4 flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to recruiter jobs
          </Link>

          {job ? (
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
                    <BriefcaseBusiness className="h-5 w-5" />
                  </div>
                  <div>
                    <h1 className="text-xl font-semibold text-slate-900">{job.title}</h1>
                    <p className="text-sm text-slate-500">{job.department}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                  <span className="rounded-md bg-slate-100 px-2 py-1">{job.employmentType}</span>
                  <span className="rounded-md bg-slate-100 px-2 py-1">{job.workMode}</span>
                  <span className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {job.location}
                  </span>
                  <span className="rounded-md bg-slate-100 px-2 py-1">{job.experienceLevel}</span>
                  <span className="rounded-md bg-emerald-50 px-2 py-1 font-semibold text-emerald-700">
                    {job.status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-md bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {publicJobUrl ? <><button type="button" onClick={() => void copyJobLink()} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Copy className="h-3.5 w-3.5" />Copy job link</button><a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(publicJobUrl)}`} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">LinkedIn</a><a href={`https://wa.me/?text=${encodeURIComponent(`${job?.title} — ${publicJobUrl}`)}`} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">WhatsApp</a><a href={`mailto:?subject=${encodeURIComponent(job?.title ?? "Job opportunity")}&body=${encodeURIComponent(publicJobUrl)}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Email</a></> : null}
                <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><RefreshCcw className="h-3.5 w-3.5" />Refresh applicants</button>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-6 px-5 py-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total applicants" value={String(ranked.length)} icon={UserCheck} />
          <MetricCard label="Shortlisted" value={String(shortlistCount)} icon={CheckCircle2} />
          <MetricCard
            label="Average AI score"
            value={
              scoredApplications.length
                ? `${Math.round(scoredApplications.reduce((sum, application) => sum + (application.atsScore ?? 0), 0) / scoredApplications.length)}%`
                : "Pending"
            }
            icon={Sparkles}
          />
          <MetricCard
            label="Manual review queue"
            value={String(ranked.filter((application) => typeof application.atsScore !== "number").length)}
            icon={FileText}
          />
        </div>

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            Loading applicants...
          </div>
        ) : ranked.length ? (
          <div className="space-y-4">
            {ranked.map((application, index) => (
              <article
                key={application.applicationId}
                className="rounded-2xl border border-slate-200 bg-white p-5"
              >
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white">
                        #{index + 1}
                      </span>
                      <Link
                        href={`/recruiter/candidates/${application.candidateId}`}
                        className="truncate text-sm font-semibold text-slate-900 hover:text-blue-700"
                      >
                        {application.candidateEmail ?? application.candidateId}
                      </Link>
                      <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${statusStyle[application.status]}`}>
                        {application.status.replaceAll("_", " ")}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                      <DataPoint
                        label="Screening"
                        value={getScreeningLabel(application)}
                        tone={typeof application.atsScore === "number" ? "text-slate-900" : "text-amber-700"}
                      />
                      <DataPoint label="Match strength" value={getMatchStrength(application)} tone="text-slate-900" />
                      <DataPoint
                        label="Applied"
                        value={new Date(application.createdAt).toLocaleString()}
                        tone="text-slate-900"
                      />
                    </div>

                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                      <SkillBlock
                        title="Matched skills"
                        items={application.matchedSkills}
                        emptyLabel="AI skills match is not available yet."
                      />
                      <SkillBlock
                        title="Missing skills"
                        items={application.missingSkills}
                        emptyLabel="No missing-skill analysis is available yet."
                      />
                    </div>

                    <label className="mt-4 block text-xs font-semibold text-slate-700">
                      Recruiter note
                      <textarea
                        rows={3}
                        value={notes[application.applicationId] ?? ""}
                        onChange={(event) =>
                          setNotes((current) => ({
                            ...current,
                            [application.applicationId]: event.target.value,
                          }))
                        }
                        className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        placeholder="Record why this candidate should move forward or be rejected."
                      />
                    </label>
                  </div>

                  <div className="flex w-full flex-col gap-2 xl:w-48">
                    <ActionButton
                      label={downloadingId === application.applicationId ? "Opening..." : "View resume"}
                      icon={ExternalLink}
                      disabled={downloadingId === application.applicationId}
                      className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      onClick={() => void onViewResume(application)}
                    />
                    <ActionButton
                      label={updatingId === application.applicationId ? "Saving..." : "Mark review"}
                      icon={FileText}
                      disabled={updatingId === application.applicationId}
                      className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                      onClick={() => void onStatus(application, "UNDER_REVIEW")}
                    />
                    <ActionButton
                      label={updatingId === application.applicationId ? "Saving..." : "Shortlist"}
                      icon={CheckCircle2}
                      disabled={updatingId === application.applicationId}
                      className="bg-green-50 text-green-700 hover:bg-green-100"
                      onClick={() => void onStatus(application, "SHORTLISTED")}
                    />
                    <ActionButton
                      label={updatingId === application.applicationId ? "Saving..." : "Reject"}
                      icon={XCircle}
                      disabled={updatingId === application.applicationId}
                      className="bg-rose-50 text-rose-700 hover:bg-rose-100"
                      onClick={() => void onStatus(application, "REJECTED")}
                    />
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <FileText className="mx-auto h-6 w-6 text-slate-300" />
            <p className="mt-3 text-sm font-medium text-slate-900">No applicants yet</p>
            <p className="mt-1 text-xs text-slate-500">
              Applications will appear here after candidates apply to this role.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof UserCheck;
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

function DataPoint({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

function SkillBlock({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items?: string[];
  emptyLabel: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {items?.length ? (
          items.map((item) => (
            <span
              key={`${title}-${item}`}
              className="rounded-md bg-white px-2 py-1 text-[11px] font-medium text-slate-700"
            >
              {item}
            </span>
          ))
        ) : (
          <p className="text-sm text-slate-500">{emptyLabel}</p>
        )}
      </div>
    </div>
  );
}

function ActionButton({
  label,
  icon: Icon,
  disabled,
  className,
  onClick,
}: {
  label: string;
  icon: typeof FileText;
  disabled: boolean;
  className: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
