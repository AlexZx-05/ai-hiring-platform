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
  Mail,
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
import WorkspaceShell from "@/components/workspace/WorkspaceShell";

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

const statusLabels: Record<RecruiterApplication["status"], string> = {
  APPLIED: "Submitted",
  PARSING: "Resume processing",
  AI_REVIEWED: "AI review complete",
  UNDER_REVIEW: "Recruiter review",
  SHORTLISTED: "Shortlisted",
  INTERVIEW_RECOMMENDED: "Interview recommended",
  INTERVIEW_SCHEDULED: "Interview scheduled",
  OFFER: "Offer",
  HIRED: "Hired",
  REJECTED: "Closed",
};

const forwardActions: Partial<Record<RecruiterApplication["status"], {
  label: string;
  status: RecruiterApplication["status"];
  icon: typeof FileText;
  className: string;
}>> = {
  AI_REVIEWED: { label: "Start review", status: "UNDER_REVIEW", icon: FileText, className: "bg-indigo-50 text-indigo-700 hover:bg-indigo-100" },
  UNDER_REVIEW: { label: "Shortlist", status: "SHORTLISTED", icon: CheckCircle2, className: "bg-green-50 text-green-700 hover:bg-green-100" },
  SHORTLISTED: { label: "Recommend interview", status: "INTERVIEW_RECOMMENDED", icon: UserCheck, className: "bg-violet-50 text-violet-700 hover:bg-violet-100" },
  INTERVIEW_RECOMMENDED: { label: "Mark interview scheduled", status: "INTERVIEW_SCHEDULED", icon: UserCheck, className: "bg-violet-50 text-violet-700 hover:bg-violet-100" },
  INTERVIEW_SCHEDULED: { label: "Record offer", status: "OFFER", icon: CheckCircle2, className: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" },
  OFFER: { label: "Mark hired", status: "HIRED", icon: CheckCircle2, className: "bg-emerald-100 text-emerald-800 hover:bg-emerald-200" },
};

const RECOMMENDED_REVIEW_THRESHOLD = 70;

function getReviewRecommendation(application: RecruiterApplication) {
  if (typeof application.atsScore !== "number") {
    return {
      label: "Scoring in progress",
      detail: "The job-specific resume analysis is not ready yet.",
      className: "border-slate-200 bg-slate-50 text-slate-700",
    };
  }

  if (application.atsScore >= RECOMMENDED_REVIEW_THRESHOLD) {
    return {
      label: "Recommend next-stage review",
      detail: `${application.atsScore}% meets the suggested ${RECOMMENDED_REVIEW_THRESHOLD}% review threshold. Verify the candidate's evidence against the role requirements before advancing.`,
      className: "border-emerald-200 bg-emerald-50 text-emerald-900",
    };
  }

  return {
    label: "Manual review recommended",
    detail: `${application.atsScore}% is below the suggested ${RECOMMENDED_REVIEW_THRESHOLD}% threshold. Review the missing skills and role requirements; do not reject based on the AI score alone.`,
    className: "border-amber-200 bg-amber-50 text-amber-950",
  };
}

function candidateEmailDraft(application: RecruiterApplication, jobTitle?: string): {
  to: string;
  subject: string;
  body: string;
  url: string;
  label: string;
} | null {
  if (!application.candidateEmail) return null;

  const candidateName = application.candidateEmail.split("@")[0].replace(/[._-]/g, " ");
  const role = jobTitle ?? "the role";
  const declined = application.status === "REJECTED";
  const interview = application.status === "INTERVIEW_RECOMMENDED" || application.status === "INTERVIEW_SCHEDULED";
  const subject = declined
    ? `Update on your ${role} application`
    : interview
      ? `Interview next steps for ${role}`
      : `Next steps for your ${role} application`;
  const body = declined
    ? `Hello ${candidateName},\n\nThank you for the time and effort you invested in applying for ${role}. After careful consideration, we will not be progressing your application at this time.\n\nWe appreciate your interest and wish you every success in your search.\n\nBest regards,\nRecruiting Team`
    : interview
      ? `Hello ${candidateName},\n\nThank you for your interest in the ${role} position. We have reviewed your application and would like to invite you to the next interview stage.\n\nPlease reply with a few times that work for you, along with your time zone. We will confirm the interview format and details.\n\nBest regards,\nRecruiting Team`
      : `Hello ${candidateName},\n\nThank you for your interest in ${role}. We are reviewing your application and will share an update about next steps as soon as we can.\n\nBest regards,\nRecruiting Team`;

  return {
    to: application.candidateEmail,
    subject,
    body,
    url: `mailto:${encodeURIComponent(application.candidateEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
    label: declined ? "Draft rejection email" : interview ? "Draft interview email" : "Draft update email",
  };
}

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
  const [copiedDraftId, setCopiedDraftId] = useState<string | null>(null);
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

  const onCopyEmailDraft = async (
    applicationId: string,
    draft: NonNullable<ReturnType<typeof candidateEmailDraft>>
  ) => {
    setError(null);
    try {
      await navigator.clipboard.writeText(
        `To: ${draft.to}\nSubject: ${draft.subject}\n\n${draft.body}`
      );
      setCopiedDraftId(applicationId);
    } catch {
      setError("Could not copy the email draft. Use Open email draft to review it in your email app.");
    }
  };

  useEffect(() => {
    void load();
  }, [params.id]);

  const hasPendingAiAnalysis = applications.some(
    (application) => application.status === "PARSING" && !application.processingError
  );

  useEffect(() => {
    if (!params.id || !hasPendingAiAnalysis) return;

    let active = true;
    const interval = window.setInterval(() => {
      listJobApplications(params.id)
        .then((items) => {
          if (active) {
            setApplications(items);
            setError(null);
          }
        })
        .catch((pollError) => {
          if (active) setError(getErrorMessage(pollError, "Unable to refresh applicant analysis."));
        });
    }, 10_000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [params.id, hasPendingAiAnalysis]);

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
    <WorkspaceShell
      title={job?.title ?? "Applicant review"}
      subtitle="Review evidence, compare candidates, and make accountable hiring decisions."
    >
      <section className="rounded-2xl border border-slate-200 bg-white px-5 py-5">
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
      </section>

      <section className="mt-6 space-y-6">
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

        <p className="rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-xs leading-5 text-blue-900">
          Applicants are ordered by their job-specific match score when analysis is available. The score summarizes documented skills, responsibilities, and relevant experience; it is a prioritization aid, not a recommendation to hire or reject.
        </p>

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
            {ranked.map((application, index) => {
              const emailDraft = candidateEmailDraft(application, job?.title);
              return (
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
                        {statusLabels[application.status]}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                      <DataPoint
                        label="AI match score"
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

                    {application.processingError ? (
                      <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                        <p className="font-semibold">Resume processing did not complete</p>
                        <p className="mt-1 leading-6">{application.processingError}</p>
                      </div>
                    ) : null}

                    {(() => {
                      const recommendation = getReviewRecommendation(application);
                      return (
                        <section className={`mt-4 rounded-xl border p-4 ${recommendation.className}`}>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="text-xs font-semibold uppercase tracking-wide">AI next-step guidance</h3>
                            {typeof application.atsScore === "number" ? (
                              <span className="rounded-full bg-white/80 px-2 py-1 text-[11px] font-semibold">
                                Suggested threshold: {RECOMMENDED_REVIEW_THRESHOLD}%
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-2 text-sm font-semibold">{recommendation.label}</p>
                          <p className="mt-1 text-sm leading-6">{recommendation.detail}</p>
                          <p className="mt-2 text-[11px] leading-5 opacity-80">This score is a review aid, not an automatic hiring decision.</p>
                        </section>
                      );
                    })()}

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

                    {application.analysisSummary ? (
                      <section className="mt-4 rounded-xl border border-violet-100 bg-violet-50/60 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-violet-900">AI fit summary</h3>
                          {typeof application.analysisConfidence === "number" ? (
                            <span className="rounded-full bg-white px-2 py-1 text-[11px] font-medium text-violet-800">
                              Analysis confidence {Math.round(application.analysisConfidence * 100)}%
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{application.analysisSummary}</p>
                      </section>
                    ) : null}

                    {application.analysisScoreBreakdown || application.analysisEvidence?.length || application.analysisStrengths?.length || application.analysisImprovementTips?.length ? (
                      <AnalysisDetails application={application} />
                    ) : null}

                    {application.screeningAnswers?.length ? (
                      <ScreeningAnswers answers={application.screeningAnswers} />
                    ) : null}

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
                    {(() => {
                      const action = forwardActions[application.status];
                      return action ? (
                        <ActionButton
                          label={updatingId === application.applicationId ? "Saving..." : action.label}
                          icon={action.icon}
                          disabled={updatingId === application.applicationId}
                          className={action.className}
                          onClick={() => void onStatus(application, action.status)}
                        />
                      ) : null;
                    })()}
                    {application.status !== "REJECTED" && application.status !== "HIRED" ? (
                      <ActionButton
                        label={updatingId === application.applicationId ? "Saving..." : "Reject"}
                        icon={XCircle}
                        disabled={updatingId === application.applicationId}
                        className="bg-rose-50 text-rose-700 hover:bg-rose-100"
                        onClick={() => void onStatus(application, "REJECTED")}
                      />
                    ) : null}
                    {emailDraft ? (
                      <>
                        <ActionButton
                          label={copiedDraftId === application.applicationId ? "Email draft copied" : "Copy email draft"}
                          icon={Copy}
                          disabled={false}
                          className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          onClick={() => void onCopyEmailDraft(application.applicationId, emailDraft)}
                        />
                        <a
                          href={emailDraft.url}
                          className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <Mail className="h-3.5 w-3.5" />
                          Open email draft
                        </a>
                      </>
                    ) : null}
                  </div>
                </div>
              </article>
              );
            })}
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
    </WorkspaceShell>
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

function ScreeningAnswers({
  answers,
}: {
  answers: NonNullable<RecruiterApplication["screeningAnswers"]>;
}) {
  return (
    <section className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-blue-900">Candidate screening responses</h3>
      <dl className="mt-3 space-y-3">
        {answers.map((item) => (
          <div key={item.questionId}>
            <dt className="text-xs font-medium text-slate-700">{item.prompt ?? "Screening question"}</dt>
            <dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-900">{item.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function AnalysisDetails({ application }: { application: RecruiterApplication }) {
  const breakdown = application.analysisScoreBreakdown;
  const evidenceStatus = {
    SUPPORTED: { label: "Evidence found", style: "bg-emerald-50 text-emerald-700" },
    PARTIAL: { label: "Partial evidence", style: "bg-amber-50 text-amber-800" },
    NOT_FOUND: { label: "Not found", style: "bg-slate-100 text-slate-600" },
  } as const;

  const scoreRows = breakdown
    ? [
        { label: "Required skills", score: breakdown.requiredSkills, weight: "50%" },
        { label: "Role responsibilities", score: breakdown.responsibilities, weight: "30%" },
        { label: "Relevant experience", score: breakdown.relevantExperience, weight: "20%" },
      ]
    : [];

  return (
    <section className="mt-4 space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      {scoreRows.length ? (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-700">How the match score is built</h3>
            <span className="text-[11px] text-slate-500">Skills 50% · Responsibilities 30% · Experience 20%</span>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {scoreRows.map((row) => {
              const score = Math.max(0, Math.min(100, Number(row.score) || 0));
              return (
                <div key={row.label} className="rounded-lg bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-slate-700">{row.label}</span>
                    <span className="text-slate-500">{row.weight}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200" role="meter" aria-label={`${row.label} score`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={score}>
                    <div className="h-full rounded-full bg-indigo-600" style={{ width: `${score}%` }} />
                  </div>
                  <p className="mt-1 text-right text-xs font-semibold text-slate-800">{Math.round(score)}%</p>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {application.analysisEvidence?.length ? (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-700">Role criteria and candidate evidence</h3>
          <ul className="mt-2 divide-y divide-slate-100">
            {application.analysisEvidence.map((item, index) => {
              const status = evidenceStatus[item.status] ?? evidenceStatus.NOT_FOUND;
              return (
                <li key={`${item.criterion}-${index}`} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-800">{item.criterion}</p>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600">{item.source === "SCREENING_RESPONSE" ? "Candidate response" : "Resume"}</span>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${status.style}`}>{status.label}</span>
                    </div>
                  </div>
                  {item.resumeEvidence ? (
                    <blockquote className="mt-2 border-l-2 border-slate-200 pl-3 text-xs leading-5 text-slate-600">“{item.resumeEvidence}”</blockquote>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {application.analysisStrengths?.length || application.analysisImprovementTips?.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {application.analysisStrengths?.length ? (
            <div className="rounded-lg bg-emerald-50/70 p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-900">Evidence-backed strengths</h3>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm leading-5 text-slate-700">
                {application.analysisStrengths.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          ) : null}
          {application.analysisImprovementTips?.length ? (
            <div className="rounded-lg bg-amber-50/70 p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-900">Resume evidence to strengthen</h3>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm leading-5 text-slate-700">
                {application.analysisImprovementTips.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      <p className="text-[11px] leading-5 text-slate-500">AI analysis is limited to job-related evidence documented in the application. “Not found” means the resume did not clearly show that criterion; it is not proof that the candidate lacks it. Use this as a review aid, not an automatic decision.</p>
    </section>
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
