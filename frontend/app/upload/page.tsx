"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  BriefcaseBusiness,
  Check,
  CircleCheck,
  FileText,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { requestResumeUploadUrl, uploadResumeToS3 } from "@/services/upload";
import { extractPdfText } from "@/services/pdf";
import {
  analyzeResume,
  getResumeParseStatus,
  submitResumeText,
  type AnalyzeResumeResponse,
} from "@/services/candidate";
import WorkspaceShell from "@/components/workspace/WorkspaceShell";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = [
  "application/pdf",
];
const PENDING_REVIEW_KEY = "resume_review_pending";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressMessage, setProgressMessage] = useState<string | null>(null);
  const [lastResumeId, setLastResumeId] = useState<string | null>(null);
  const [jobRequirements, setJobRequirements] = useState("");
  const [analysis, setAnalysis] = useState<AnalyzeResumeResponse | null>(null);
  const [analysisRequested, setAnalysisRequested] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const submitInFlightRef = useRef(false);
  const jobRequirementsRef = useRef(jobRequirements);
  const analysisRequestKeyRef = useRef<string | null>(null);
  const [parseStatus, setParseStatus] = useState<
    "IDLE" | "PENDING" | "PROCESSING" | "FAILED" | "SUCCEEDED"
  >("IDLE");

  const maxSizeLabel = useMemo(() => "5MB", []);

  useEffect(() => {
    try {
      const savedReport = sessionStorage.getItem("resume_review_result");
      if (savedReport) {
        const saved = JSON.parse(savedReport) as {
          resumeId?: string;
          jobRequirements?: string;
          result?: AnalyzeResumeResponse;
        };
        if (saved.resumeId && saved.jobRequirements && saved.result) {
          setLastResumeId(saved.resumeId);
          setJobRequirements(saved.jobRequirements);
          jobRequirementsRef.current = saved.jobRequirements;
          setParseStatus("SUCCEEDED");
          setAnalysis(saved.result);
        }
      }
      const pendingReview = sessionStorage.getItem(PENDING_REVIEW_KEY);
      if (pendingReview) {
        const saved = JSON.parse(pendingReview) as {
          resumeId?: string;
          jobRequirements?: string;
        };
        if (saved.resumeId && saved.jobRequirements) {
          setLastResumeId(saved.resumeId);
          setJobRequirements(saved.jobRequirements);
          jobRequirementsRef.current = saved.jobRequirements;
          setParseStatus("PENDING");
          setAnalysisRequested(true);
          setProgressMessage("Your review is continuing in the background.");
        }
      }
    } catch {
      sessionStorage.removeItem(PENDING_REVIEW_KEY);
    } finally {
      setInitialized(true);
    }
  }, []);

  useEffect(() => {
    if (
      !initialized ||
      !lastResumeId ||
      (parseStatus !== "PENDING" && parseStatus !== "PROCESSING")
    ) {
      return;
    }

    let cancelled = false;
    let timer: number;
    const checkStatus = async () => {
      try {
        const status = await getResumeParseStatus(lastResumeId);
        if (cancelled) return;
        setParseStatus(status.parseStatus);
        if (status.parseStatus === "PENDING") {
          setProgressMessage("Your resume is securely queued for text extraction.");
        } else if (status.parseStatus === "PROCESSING") {
          setProgressMessage("Resume text extraction is underway. You can leave this page; your review will continue.");
        } else if (status.parseStatus === "FAILED") {
          let detail = "";
          try {
            detail = JSON.parse(status.parseDetails ?? "{}").message ?? "";
          } catch {
            detail = "";
          }
          setAnalysisRequested(false);
          setProgressMessage(null);
          setError(detail || "We couldn’t read this PDF. Try a text-based PDF with selectable text.");
          sessionStorage.removeItem(PENDING_REVIEW_KEY);
          return;
        }
        if (status.parseStatus === "PENDING" || status.parseStatus === "PROCESSING") {
          timer = window.setTimeout(checkStatus, 8000);
        }
      } catch {
        if (!cancelled) {
          setProgressMessage("We’re reconnecting to check your resume. Your upload is safe.");
          timer = window.setTimeout(checkStatus, 15000);
        }
      }
    };

    timer = window.setTimeout(checkStatus, 2500);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [initialized, lastResumeId, parseStatus]);

  useEffect(() => {
    if (!initialized || !analysisRequested || parseStatus !== "SUCCEEDED" || !lastResumeId) {
      return;
    }

    const requestKey = `${lastResumeId}:${jobRequirementsRef.current.trim()}`;
    if (analysisRequestKeyRef.current === requestKey) return;
    analysisRequestKeyRef.current = requestKey;

    let cancelled = false;
    setAnalyzing(true);
    setProgressMessage("Resume extracted. Generating your role-specific review…");
    void analyzeResume({
      resumeId: lastResumeId,
      jobRequirements: jobRequirementsRef.current.trim(),
      mode: "analyze",
    }).then((result) => {
      sessionStorage.setItem("resume_review_result", JSON.stringify({
        resumeId: lastResumeId,
        jobRequirements: jobRequirementsRef.current,
        result,
      }));
      sessionStorage.removeItem(PENDING_REVIEW_KEY);
      if (cancelled) return;
      setAnalysis(result);
      setAnalysisRequested(false);
      setAnalyzing(false);
      setProgressMessage("Review complete. Your report is ready below.");
    }).catch((err: unknown) => {
      analysisRequestKeyRef.current = null;
      if (cancelled) return;
      const response = (
        err as { response?: { status?: number; data?: { message?: string } } }
      )?.response;
      setError(
        response?.status === 401
          ? "Your sign-in session is invalid or expired. Please sign out and sign in again, then retry the analysis."
          : response?.data?.message ??
            (err instanceof Error ? err.message : "We couldn’t complete the resume analysis.")
      );
      setAnalysisRequested(false);
      setAnalyzing(false);
      setProgressMessage(null);
      sessionStorage.removeItem(PENDING_REVIEW_KEY);
    }).finally(() => {
      if (!cancelled) setAnalyzing(false);
    });
    return () => {
      cancelled = true;
    };
  }, [analysisRequested, initialized, lastResumeId, parseStatus]);

  const onAnalyze = async () => {
    setError(null);
    setProgressMessage(null);
    setAnalysis(null);

    const requirements = jobRequirements.trim();
    if (!requirements) {
      setError("Add the job description or required skills so the analysis can be tailored to the role.");
      return;
    }
    if (requirements.length < 40) {
      setError("Please add a little more detail about the role (at least 40 characters) for a useful comparison.");
      return;
    }
    if (requirements.length > 12000) {
      setError("Keep the job description under 12,000 characters.");
      return;
    }

    if (submitInFlightRef.current) return;
    submitInFlightRef.current = true;
    setLoading(true);
    try {
      let resumeId = lastResumeId;
      let resumeIsParsed = parseStatus === "SUCCEEDED";

      if (file) {
        if (
          !file.name.toLowerCase().endsWith(".pdf") ||
          (file.type !== "" && !ALLOWED_TYPES.includes(file.type))
        ) {
          setError("Choose a valid PDF file to continue.");
          return;
        }
        if (file.size > MAX_FILE_SIZE_BYTES) {
          setError(`File size must be ${maxSizeLabel} or less.`);
          return;
        }

        setParseStatus("PENDING");
        setProgressMessage("Reading resume text securely in your browser…");
        const resumeText = await extractPdfText(file);
        setProgressMessage("Uploading your resume securely…");
        const presign = await requestResumeUploadUrl({
          fileName: file.name,
          contentType: "application/pdf",
          sizeBytes: file.size,
        });
        await uploadResumeToS3(presign.uploadUrl, file);
        setProgressMessage("Saving extracted text for your private review…");
        await submitResumeText(presign.resumeId, presign.objectKey, resumeText);
        resumeId = presign.resumeId;
        setLastResumeId(resumeId);
        sessionStorage.setItem(PENDING_REVIEW_KEY, JSON.stringify({
          resumeId,
          jobRequirements: requirements,
        }));
        sessionStorage.removeItem("resume_review_result");
        jobRequirementsRef.current = requirements;
        analysisRequestKeyRef.current = null;
        setFile(null);
        const input = document.getElementById("resume-file") as HTMLInputElement | null;
        if (input) input.value = "";

        setParseStatus("SUCCEEDED");
        setAnalysisRequested(true);
        setProgressMessage("Resume text is ready. Starting your role-specific review…");
        return;
      }

      if (!resumeId) {
        setError("Choose your PDF resume before starting the analysis.");
        return;
      }
      if (!resumeIsParsed) {
        if (parseStatus === "FAILED") {
          throw new Error("We couldn’t read this PDF. Try a text-based PDF rather than a scanned image.");
        }
        const status = await getResumeParseStatus(resumeId);
        setParseStatus(status.parseStatus);
        if (status.parseStatus !== "SUCCEEDED") {
          setProgressMessage("This older upload is still waiting on the previous extraction service. Upload the PDF again to extract its text in your browser.");
          return;
        }
      }

      setAnalyzing(true);
      setProgressMessage("Comparing your resume with the job description…");
      const result = await analyzeResume({
        resumeId,
        jobRequirements: requirements,
        mode: "analyze",
      });
      setAnalysis(result);
      setProgressMessage("Review complete. Your report is ready below.");
      setAnalysisRequested(false);
      sessionStorage.setItem("resume_review_result", JSON.stringify({
        resumeId,
        jobRequirements: requirements,
        result,
      }));
      sessionStorage.removeItem(PENDING_REVIEW_KEY);
    } catch (err) {
      const response = (
        err as {
          response?: {
            status?: number;
            data?: { message?: string };
          };
        }
      )?.response;
      const responseMessage = response?.status === 401
        ? "Your sign-in session is invalid or expired. Please sign out and sign in again, then retry the analysis."
        : response?.data?.message;
      setProgressMessage(null);
      setError(
        responseMessage ??
          (err instanceof Error ? err.message : "We couldn’t complete the resume analysis.")
      );
    } finally {
      setLoading(false);
      setAnalyzing(false);
      submitInFlightRef.current = false;
    }
  };

  return (
    <WorkspaceShell
      title="Resume review"
      subtitle="Get a structured, evidence-based view of how your resume aligns with a role."
    >
      <section className="mx-auto max-w-5xl space-y-6">
        <header className="overflow-hidden rounded-2xl bg-slate-950 px-6 py-8 text-white shadow-sm sm:px-9 sm:py-10">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-indigo-500/20 p-3 text-indigo-200">
              <Sparkles aria-hidden="true" className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-300">Career toolkit</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Resume-to-role review</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                See where your experience aligns with a job, what evidence supports the match, and how to strengthen your resume truthfully.
              </p>
            </div>
          </div>
          <ol aria-label="Review steps" className="mt-8 grid gap-3 sm:grid-cols-3">
            <WorkflowStep number="01" title="Add your resume" complete={Boolean(lastResumeId)} active={!lastResumeId} />
            <WorkflowStep number="02" title="Add the role" complete={Boolean(analysis)} active={Boolean(lastResumeId) && !analysis} />
            <WorkflowStep number="03" title="Review your report" complete={Boolean(analysis)} active={false} />
          </ol>
        </header>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div>
              <div className="flex items-center gap-2 text-slate-900">
                <FileText aria-hidden="true" className="h-5 w-5 text-indigo-600" />
                <h2 className="text-lg font-semibold">Your resume</h2>
              </div>
              <p className="mt-1 text-sm leading-5 text-slate-500">PDF format, up to {maxSizeLabel}. Your file is private to your account.</p>
            </div>
            <label htmlFor="resume-file" className="flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center transition hover:border-indigo-400 hover:bg-indigo-50/40">
              <span className="rounded-full bg-white p-3 text-indigo-600 shadow-sm">
                <FileText aria-hidden="true" className="h-6 w-6" />
              </span>
              <span className="mt-3 text-sm font-semibold text-slate-900">
                {file?.name ?? (lastResumeId ? "Choose a different PDF" : "Choose your resume PDF")}
              </span>
              <span className="mt-1 text-xs text-slate-500">
                {file ? `${Math.ceil(file.size / 1024)} KB · Ready to upload` : "Select a text-based PDF for best results"}
              </span>
              <input
                id="resume-file"
                type="file"
                accept=".pdf,application/pdf"
                className="sr-only"
                onChange={(event) => {
                  const selected = event.target.files?.[0] ?? null;
                  setFile(selected);
                  setLastResumeId(null);
                  setParseStatus("IDLE");
                  setAnalysisRequested(false);
                  setAnalysis(null);
                  setError(null);
                  setProgressMessage(null);
                  sessionStorage.removeItem(PENDING_REVIEW_KEY);
                  sessionStorage.removeItem("resume_review_result");
                }}
              />
            </label>
            <div className="flex items-start gap-3 rounded-xl border border-slate-200 p-4">
              {loading ? (
                <LoaderCircle aria-hidden="true" className="mt-0.5 h-5 w-5 animate-spin text-indigo-600" />
              ) : parseStatus === "FAILED" ? (
                <AlertCircle aria-hidden="true" className="mt-0.5 h-5 w-5 text-rose-600" />
              ) : parseStatus === "SUCCEEDED" ? (
                <CircleCheck aria-hidden="true" className="mt-0.5 h-5 w-5 text-emerald-600" />
              ) : (
                <ShieldCheck aria-hidden="true" className="mt-0.5 h-5 w-5 text-slate-500" />
              )}
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {analyzing
                    ? "Comparing your experience with the role"
                    : loading
                    ? "Preparing your resume"
                    : parseStatus === "SUCCEEDED" ? "Resume ready"
                      : parseStatus === "PROCESSING" ? "Extracting resume text"
                        : parseStatus === "PENDING" ? "Resume queued"
                          : parseStatus === "FAILED" ? "Resume extraction failed"
                            : "Secure upload and browser text extraction"}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {analyzing
                    ? "The AI is reviewing your documented skills, experience, and evidence against the job description."
                    : loading
                    ? "Selectable text is extracted in your browser, and your PDF is uploaded securely."
                    : parseStatus === "SUCCEEDED" ? "The resume text is ready for role comparison."
                      : parseStatus === "PROCESSING" ? "This is an older upload still waiting on the previous extraction process. Upload it again to use browser extraction."
                        : parseStatus === "PENDING" ? "This upload is still waiting on the previous extraction process. Upload it again to use browser extraction."
                          : parseStatus === "FAILED" ? "This upload could not be extracted by the previous service. Upload it again to extract selectable text in your browser."
                            : "Your file is only uploaded after you start the review."}
                </p>
                {progressMessage ? (
                  <p role="status" className="mt-2 text-xs font-medium leading-5 text-indigo-700">
                    {progressMessage}
                  </p>
                ) : null}
              </div>
            </div>
            {parseStatus === "PENDING" || parseStatus === "PROCESSING" ? (
              <div role="status" className="rounded-lg bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-900">
                Processing can take up to a couple of minutes. If it is still pending after that, try again later; you won’t need to upload the file again.
              </div>
            ) : null}
          </section>

          <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div>
              <div className="flex items-center gap-2 text-slate-900">
                <BriefcaseBusiness aria-hidden="true" className="h-5 w-5 text-indigo-600" />
                <h2 className="text-lg font-semibold">Target role</h2>
              </div>
              <p className="mt-1 text-sm leading-5 text-slate-500">Paste the job description so the review is tailored to this opportunity.</p>
            </div>
            <label htmlFor="job-requirements" className="sr-only">Job description and requirements</label>
            <textarea
              id="job-requirements"
              rows={12}
              value={jobRequirements}
              maxLength={12000}
              onChange={(event) => {
                setJobRequirements(event.target.value);
                jobRequirementsRef.current = event.target.value;
                setAnalysis(null);
                setError(null);
                if (lastResumeId && analysisRequested) {
                  sessionStorage.setItem(PENDING_REVIEW_KEY, JSON.stringify({
                    resumeId: lastResumeId,
                    jobRequirements: event.target.value,
                  }));
                }
                sessionStorage.removeItem("resume_review_result");
              }}
              className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="Paste the job description, including responsibilities and required skills…"
            />
            <div className="flex items-start justify-between gap-3 text-xs text-slate-500">
              <p>At least 40 characters · Up to 12,000</p>
              <span className="shrink-0">{jobRequirements.length.toLocaleString()}/12,000</span>
            </div>

          {error ? (
            <p role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-5 text-rose-700">
              <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          ) : null}

            <div className="pt-1">
              <button
                type="button"
                onClick={onAnalyze}
                disabled={
                  (!file && !lastResumeId) ||
                  loading ||
                  analyzing ||
                  parseStatus === "PENDING" ||
                  parseStatus === "PROCESSING" ||
                  analysisRequested
                }
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
              >
                {loading || analyzing ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Sparkles aria-hidden="true" className="h-4 w-4" />}
                {loading
                  ? file
                    ? "Uploading and preparing your review…"
                    : "Checking extraction status…"
                  : analyzing
                    ? "Reviewing your resume against this role…"
                    : analysisRequested
                      ? "Review processing in the background"
                    : lastResumeId && parseStatus !== "SUCCEEDED"
                      ? "Check status and continue"
                      : analysis ? "Run review again" : "Generate my resume review"}
              </button>
              <p className="mt-3 flex items-start justify-center gap-2 text-center text-xs leading-5 text-slate-500">
                <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                Private to your account. This review is advisory and does not submit a job application.
              </p>
            </div>
          </section>
        </div>

          {analysis ? (
            <section aria-live="polite" className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-5 border-b border-slate-100 pb-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-700">Your review report</p>
                  <h2 className="mt-1 text-2xl font-bold text-slate-950">Resume-to-role match</h2>
                  <p className="mt-1 text-sm text-slate-500">Generated {new Date(analysis.analyzedAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-indigo-50 px-4 py-3">
                  <div className="text-right">
                    <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Alignment score</p>
                    <p className="text-3xl font-bold tabular-nums text-indigo-950">{analysis.atsScore}<span className="text-base font-semibold text-indigo-700">/100</span></p>
                  </div>
                  <span className="rounded-full bg-white p-2 text-indigo-600"><Sparkles aria-hidden="true" className="h-5 w-5" /></span>
                </div>
              </div>

              {analysis.providerStatus === "FALLBACK" ? (
                <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-900">
                  {analysis.providerMessage ?? "AI analysis is temporarily unavailable. Try again later for AI-assisted insights."}
                </p>
              ) : null}

              {analysis.applicationRecommendation ? (
                <section className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-4">
                  <h3 className="text-sm font-semibold text-indigo-950">
                    Advisory next step: {analysis.applicationRecommendation.label}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-indigo-900">
                    {analysis.applicationRecommendation.rationale}
                  </p>
                  <p className="mt-2 text-xs text-indigo-800">
                    This is guidance for your own application and is not a hiring decision or a shortlist probability.
                  </p>
                </section>
              ) : null}

              <div className="grid gap-5 md:grid-cols-[1fr_1.4fr]">
                <div className="flex flex-col items-center justify-center rounded-xl bg-slate-50 p-5 text-center">
                  <p className="text-sm font-semibold text-slate-900">{getScoreLabel(analysis.atsScore)}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{getScoreDescription(analysis.atsScore)}</p>
                  <p className="mt-4 text-xs text-slate-500">AI confidence: {Math.round(analysis.confidence <= 1 ? analysis.confidence * 100 : analysis.confidence)}%</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-5">
                  <h3 className="text-sm font-semibold text-slate-950">Professional summary</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{analysis.summary}</p>
                </div>
              </div>

              {analysis.scoreBreakdown ? (
                <div className="rounded-xl border border-slate-200 p-5">
                  <h3 className="text-sm font-semibold text-slate-950">Match by dimension</h3>
                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    <ScoreBar label="Required skills" score={analysis.scoreBreakdown.requiredSkills} />
                    <ScoreBar label="Responsibilities" score={analysis.scoreBreakdown.responsibilities} />
                    <ScoreBar label="Relevant experience" score={analysis.scoreBreakdown.relevantExperience} />
                  </div>
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <InsightList title="Relevant strengths" items={analysis.strengths ?? analysis.matchedSkills} tone="emerald" empty="No specific strengths were identified in the report." />
                <InsightList title="Ways to strengthen your resume" items={analysis.improvementTips ?? []} tone="indigo" empty="No additional improvement suggestions were identified." />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <SkillList title="Skills evidenced in your resume" skills={analysis.matchedSkills} tone="emerald" empty="No listed role skills were clearly identified in the resume text." />
                <SkillList title="Role criteria not clearly evidenced" skills={analysis.missingSkills} tone="amber" empty="No major skill gaps were identified against this job description." />
              </div>

              {analysis.evidence?.length ? (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                    <h3 className="text-sm font-semibold text-slate-950">Evidence against role requirements</h3>
                  </div>
                  <ul className="divide-y divide-slate-100">
                    {analysis.evidence.map((item, index) => (
                      <li key={`${item.criterion}-${index}`} className="grid gap-2 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-start">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{item.criterion}</p>
                          {item.resumeEvidence ? <p className="mt-1 text-xs leading-5 text-slate-600">“{item.resumeEvidence}”</p> : null}
                        </div>
                        <EvidenceBadge status={item.status} />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <p className="rounded-lg bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
                This is an advisory comparison, not a hiring decision. “Not evidenced” means the PDF did not clearly document the criterion; it does not mean you lack that skill. Only add accurate, verifiable details to your resume.
              </p>
            </section>
          ) : null}
      </section>
    </WorkspaceShell>
  );
}

function SkillList({
  title,
  skills,
  tone,
  empty,
}: {
  title: string;
  skills: string[];
  tone: "emerald" | "amber" | "indigo";
  empty: string;
}) {
  const palette = tone === "emerald"
    ? { card: "border-emerald-100 bg-emerald-50/50", heading: "text-emerald-900", chip: "bg-white text-emerald-800 ring-emerald-200" }
    : tone === "amber"
      ? { card: "border-amber-100 bg-amber-50/50", heading: "text-amber-900", chip: "bg-white text-amber-900 ring-amber-200" }
      : { card: "border-indigo-100 bg-indigo-50/50", heading: "text-indigo-900", chip: "bg-white text-indigo-800 ring-indigo-200" };

  return (
    <div className={`rounded-xl border p-4 ${palette.card}`}>
      <h3 className={`text-sm font-semibold ${palette.heading}`}>{title}</h3>
      {skills.length ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {skills.map((skill) => (
            <li key={`${title}-${skill}`} className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${palette.chip}`}>
              {skill}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm leading-5 text-slate-600">{empty}</p>
      )}
    </div>
  );
}

function WorkflowStep({
  number,
  title,
  complete,
  active,
}: {
  number: string;
  title: string;
  complete: boolean;
  active: boolean;
}) {
  return (
    <li className={`flex items-center gap-3 rounded-xl border px-3 py-3 ${
      active ? "border-indigo-300 bg-white/10" : "border-white/10 bg-white/5"
    }`}>
      <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
        complete ? "bg-emerald-400 text-slate-950" : active ? "bg-indigo-400 text-slate-950" : "bg-white/10 text-slate-300"
      }`}>
        {complete ? <Check aria-hidden="true" className="h-4 w-4" /> : number}
      </span>
      <span className={`text-sm font-medium ${active || complete ? "text-white" : "text-slate-400"}`}>{title}</span>
    </li>
  );
}

function InsightList({
  title,
  items,
  tone,
  empty,
}: {
  title: string;
  items: string[];
  tone: "emerald" | "indigo";
  empty: string;
}) {
  const iconColor = tone === "emerald" ? "text-emerald-700" : "text-indigo-700";
  const panelColor = tone === "emerald" ? "border-emerald-100 bg-emerald-50/40" : "border-indigo-100 bg-indigo-50/40";
  return (
    <div className={`rounded-xl border p-4 ${panelColor}`}>
      <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
      {items.length ? (
        <ul className="mt-3 space-y-3">
          {items.map((item, index) => (
            <li key={`${title}-${index}`} className="flex items-start gap-2.5 text-sm leading-5 text-slate-700">
              <CircleCheck aria-hidden="true" className={`mt-0.5 h-4 w-4 shrink-0 ${iconColor}`} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm leading-5 text-slate-600">{empty}</p>
      )}
    </div>
  );
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Strong alignment";
  if (score >= 60) return "Good alignment";
  if (score >= 40) return "Partial alignment";
  return "Limited documented alignment";
}

function getScoreDescription(score: number): string {
  if (score >= 80) return "Your resume documents several relevant capabilities for this role.";
  if (score >= 60) return "Your resume shows relevant experience, with opportunities to make some qualifications clearer.";
  if (score >= 40) return "Some relevant evidence is present. Review the role criteria and suggestions below.";
  return "The resume currently documents limited evidence for this role. Check the criteria below and ensure relevant experience is included accurately.";
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="font-semibold tabular-nums text-slate-900">{score}/100</span>
      </div>
      <div
        role="progressbar"
        aria-label={`${label} match`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
        className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"
      >
        <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${Math.max(0, Math.min(100, score))}%` }} />
      </div>
    </div>
  );
}

function EvidenceBadge({ status }: { status: "SUPPORTED" | "PARTIAL" | "NOT_FOUND" }) {
  const style = status === "SUPPORTED"
    ? "bg-emerald-50 text-emerald-800"
    : status === "PARTIAL"
      ? "bg-amber-50 text-amber-900"
      : "bg-slate-100 text-slate-700";
  const label = status === "NOT_FOUND" ? "Not evidenced" : status === "PARTIAL" ? "Partially evidenced" : "Evidenced";
  return <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${style}`}>{label}</span>;
}
