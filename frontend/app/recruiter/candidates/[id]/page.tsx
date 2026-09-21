"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  FileSearch,
  FileText,
  Mail,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { getRecruiterCandidate, type CandidateRecord } from "@/services/recruiter";
import WorkspaceShell from "@/components/workspace/WorkspaceShell";

type ApplicationRecord = CandidateRecord & {
  applicationId?: string;
  candidateEmail?: string;
  coverNote?: string;
  createdAt?: string;
  jobId?: string;
  recruiterNote?: string;
  resumeId?: string;
  screeningAnswers?: Array<{ questionId: string; prompt?: string; answer: string }>;
  status?: string;
  updatedAt?: string;
};

type AnalysisRecord = CandidateRecord & {
  analyzedAt?: string;
  atsScore?: number;
  confidence?: number;
  matchedSkills?: string[];
  missingSkills?: string[];
  summary?: string;
};

type ResumeExtractionRecord = CandidateRecord & {
  normalized?: string | { name?: string; email?: string; phone?: string; skills?: string[] };
  parsedAt?: string;
  rawText?: string;
};

function isApplicationRecord(record: CandidateRecord): record is ApplicationRecord {
  return record.entityType === "APPLICATION";
}

function isAnalysisRecord(record: CandidateRecord): record is AnalysisRecord {
  const entityType = String(record.entityType ?? "").toLowerCase();
  const sortKey = String(record.SK ?? "");
  return entityType === "resumeanalysis" || sortKey.includes("#ANALYSIS#") || sortKey.startsWith("ANALYSIS#");
}

function isResumeExtractionRecord(record: CandidateRecord): record is ResumeExtractionRecord {
  const entityType = String(record.entityType ?? "").toLowerCase();
  const sortKey = String(record.SK ?? "");
  return entityType === "resumeextraction" || sortKey.includes("#EXTRACTION#");
}

function parseExtraction(record?: ResumeExtractionRecord): {
  name?: string;
  email?: string;
  phone?: string;
  skills: string[];
} {
  if (!record?.normalized) return { skills: [] };

  const normalized =
    typeof record.normalized === "string"
      ? (() => {
          try {
            return JSON.parse(record.normalized) as Record<string, unknown>;
          } catch {
            return {};
          }
        })()
      : record.normalized;

  return {
    name: typeof normalized.name === "string" ? normalized.name : undefined,
    email: typeof normalized.email === "string" ? normalized.email : undefined,
    phone: typeof normalized.phone === "string" ? normalized.phone : undefined,
    skills: Array.isArray(normalized.skills) ? normalized.skills.map(String).filter(Boolean) : [],
  };
}

function extractProjectHighlights(rawText?: string): string[] {
  if (!rawText) return [];

  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const projectStart = lines.findIndex((line) => /^(key )?projects?|project experience$/i.test(line));
  if (projectStart < 0) return [];

  const highlights: string[] = [];
  for (const line of lines.slice(projectStart + 1)) {
    if (/^(experience|work experience|employment|education|certifications?|skills|achievements?|interests?)$/i.test(line)) break;
    if (line.length > 2 && !highlights.includes(line)) highlights.push(line);
    if (highlights.length === 4) break;
  }
  return highlights;
}

function formatDate(value?: string): string {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function RecruiterCandidateProfilePage() {
  const params = useParams<{ id: string }>();
  const [records, setRecords] = useState<CandidateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) {
      return;
    }

    let active = true;
    getRecruiterCandidate(params.id)
      .then((result) => {
        if (active) {
          setRecords(result.records);
        }
      })
      .catch((loadError) => {
        if (active) {
          setError(
            (loadError as { response?: { data?: { message?: string } } })?.response?.data
              ?.message ?? "Unable to load candidate profile."
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [params.id]);

  const applications = useMemo(
    () => records.filter(isApplicationRecord).sort((left, right) => Date.parse(right.updatedAt ?? "") - Date.parse(left.updatedAt ?? "")),
    [records]
  );
  const analyses = useMemo(
    () => records.filter(isAnalysisRecord).sort((left, right) => Date.parse(right.analyzedAt ?? "") - Date.parse(left.analyzedAt ?? "")),
    [records]
  );
  const extractions = useMemo(
    () => records.filter(isResumeExtractionRecord).sort((left, right) => Date.parse(right.parsedAt ?? "") - Date.parse(left.parsedAt ?? "")),
    [records]
  );
  const latestApplication = applications[0];
  const latestAnalysis = analyses[0];
  const latestExtraction = extractions[0];
  const profile = parseExtraction(latestExtraction);
  const candidateEmail = latestApplication?.candidateEmail ?? profile.email;
  const projectHighlights = extractProjectHighlights(latestExtraction?.rawText);
  const contactCandidate = () => {
    if (!candidateEmail) return;

    const candidateName = profile.name ?? candidateEmail.split("@")[0];
    const role = latestApplication?.jobId
      ? `regarding your application (reference: ${latestApplication.jobId})`
      : "regarding your application";
    const body = `Hello ${candidateName},\n\nThank you for your interest. We reviewed your profile and would like to connect with you ${role}.\n\nPlease reply with your availability for a brief conversation and any questions you may have.\n\nBest regards,\nRecruiting Team`;
    window.location.href = `mailto:${encodeURIComponent(candidateEmail)}?subject=${encodeURIComponent("Update on your application")}&body=${encodeURIComponent(body)}`;
  };

  return (
    <WorkspaceShell
      title={profile.name ?? "Candidate profile"}
      subtitle="Review application history, resume evidence, and AI screening results."
    >
      <section className="rounded-2xl border border-slate-200 bg-white px-5 py-5">
          <Link
            href="/candidates"
            className="mb-4 flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to candidate directory
          </Link>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
                <UserCheck className="h-4 w-4" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-900">{profile.name ?? "Candidate Profile"}</h1>
                <p className="text-sm text-slate-500">{candidateEmail ?? params.id}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={contactCandidate}
              disabled={!candidateEmail}
              title={candidateEmail ? "Open a prepared professional email in your mail client" : "No candidate email is available"}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Mail className="h-3.5 w-3.5" />
              Contact candidate
            </button>
          </div>
      </section>

      <section className="mt-6 max-w-6xl space-y-6">
        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            Loading candidate...
          </div>
        ) : records.length ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <InfoCard label="Applications" value={String(applications.length)} icon={FileText} />
              <InfoCard
                label="Latest status"
                value={latestApplication?.status?.replaceAll("_", " ") ?? "No application"}
                icon={FileSearch}
              />
              <InfoCard
                label="AI score"
                value={typeof latestAnalysis?.atsScore === "number" ? `${latestAnalysis.atsScore}%` : "Pending"}
                icon={Sparkles}
              />
              <InfoCard
                label="Last update"
                value={latestApplication?.updatedAt ? formatDate(latestApplication.updatedAt) : "Not available"}
                icon={Mail}
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <h2 className="text-sm font-semibold text-slate-900">Application history</h2>
                <div className="mt-4 space-y-4">
                  {applications.map((application) => (
                    <article
                      key={application.applicationId ?? application.SK?.toString()}
                      className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">
                          Job {application.jobId ?? "Unknown"}
                        </p>
                        {application.status ? (
                          <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-700">
                            {application.status.replaceAll("_", " ")}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        Submitted {formatDate(application.createdAt)} · Updated {formatDate(application.updatedAt)}
                      </p>
                      {application.coverNote ? (
                        <p className="mt-3 text-sm leading-6 text-slate-700">{application.coverNote}</p>
                      ) : (
                        <p className="mt-3 text-sm text-slate-500">No candidate cover note provided.</p>
                      )}
                      {application.screeningAnswers?.length ? (
                        <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Screening responses</p>
                          <dl className="mt-2 space-y-2">
                            {application.screeningAnswers.map((answer) => (
                              <div key={answer.questionId}>
                                <dt className="text-xs font-medium text-slate-700">{answer.prompt ?? "Screening question"}</dt>
                                <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-900">{answer.answer}</dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                      ) : null}
                      {application.recruiterNote ? (
                        <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                          Recruiter note: {application.recruiterNote}
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              </section>

              <section className="space-y-6">
                <article className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h2 className="text-sm font-semibold text-slate-900">Resume profile</h2>
                  {latestExtraction ? (
                    <div className="mt-4 space-y-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <ProfileField label="Email" value={profile.email ?? candidateEmail ?? "Not detected"} />
                        <ProfileField label="Phone" value={profile.phone ?? "Not detected"} />
                      </div>
                      <SkillGroup title="Core skills" items={profile.skills} emptyLabel="No skills were extracted from the current resume." />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Project highlights</p>
                        {projectHighlights.length ? (
                          <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
                            {projectHighlights.map((highlight) => <li key={highlight}>• {highlight}</li>)}
                          </ul>
                        ) : (
                          <p className="mt-2 text-sm text-slate-500">No dedicated project section was detected in the resume.</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-slate-500">Resume parsing has not produced a profile yet.</p>
                  )}
                </article>

                <article className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h2 className="text-sm font-semibold text-slate-900">AI screening snapshot</h2>
                  {latestAnalysis ? (
                    <div className="mt-4 space-y-4">
                      <div className="rounded-xl bg-slate-950 px-4 py-4 text-white">
                        <p className="text-xs uppercase tracking-wide text-slate-400">ATS score</p>
                        <p className="mt-2 text-3xl font-semibold">{latestAnalysis.atsScore ?? 0}%</p>
                        <p className="mt-1 text-xs text-slate-300">
                          Confidence {latestAnalysis.confidence ?? "n/a"} · {formatDate(latestAnalysis.analyzedAt)}
                        </p>
                      </div>
                      <SkillGroup title="Matched skills" items={latestAnalysis.matchedSkills} emptyLabel="No matched skills recorded." />
                      <SkillGroup title="Missing skills" items={latestAnalysis.missingSkills} emptyLabel="No missing skills recorded." />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Summary</p>
                        <p className="mt-2 text-sm leading-6 text-slate-700">
                          {latestAnalysis.summary ?? "No AI summary available."}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      No AI analysis record exists yet for this candidate. When your Grok-backed parser writes analysis data, it will appear here automatically.
                    </div>
                  )}
                </article>

                <article className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h2 className="text-sm font-semibold text-slate-900">Raw record count</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    {records.length} DynamoDB records loaded for this candidate profile.
                  </p>
                </article>
              </section>
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <UserCheck className="mx-auto h-6 w-6 text-slate-300" />
            <p className="mt-3 text-sm font-medium text-slate-900">No profile records found</p>
          </div>
        )}
      </section>
    </WorkspaceShell>
  );
}

function InfoCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof FileText;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </article>
  );
}

function SkillGroup({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items?: string[];
  emptyLabel: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {items?.length ? (
          items.map((item) => (
            <span
              key={`${title}-${item}`}
              className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700"
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

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}
