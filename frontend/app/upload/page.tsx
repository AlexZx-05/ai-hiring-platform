"use client";

import { useMemo, useState } from "react";
import { requestResumeUploadUrl, uploadResumeToS3 } from "@/services/upload";
import {
  analyzeResume,
  getResumeParseStatus,
  type AnalyzeResumeResponse,
} from "@/services/candidate";
import WorkspaceShell from "@/components/workspace/WorkspaceShell";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = [
  "application/pdf",
];

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastResumeId, setLastResumeId] = useState<string | null>(null);
  const [jobRequirements, setJobRequirements] = useState("");
  const [analysis, setAnalysis] = useState<AnalyzeResumeResponse | null>(null);
  const [parseStatus, setParseStatus] = useState<
    "IDLE" | "PENDING" | "PROCESSING" | "FAILED" | "SUCCEEDED"
  >("IDLE");

  const maxSizeLabel = useMemo(() => "5MB", []);

  const onSubmit = async () => {
    setError(null);
    setSuccess(null);
    setAnalysis(null);

    if (!file) {
      setError("Please select a resume file.");
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Only PDF files are allowed.");
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(`File size must be ${maxSizeLabel} or less.`);
      return;
    }

    setLoading(true);
    try {
      const presign = await requestResumeUploadUrl({
        fileName: file.name,
        contentType: file.type,
        sizeBytes: file.size,
      });

      await uploadResumeToS3(presign.uploadUrl, file);
      setSuccess(
        `Resume uploaded successfully. Resume ID: ${presign.resumeId}`
      );
      setLastResumeId(presign.resumeId);
      setParseStatus("PENDING");
      setError("Resume uploaded. Parsing started. Checking status...");
      setFile(null);
      const input = document.getElementById(
        "resume-file"
      ) as HTMLInputElement | null;
      if (input) {
        input.value = "";
      }

      const maxAttempts = 30;
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 4000));
        const status = await getResumeParseStatus(presign.resumeId);
        setParseStatus(status.parseStatus);

        if (status.parseStatus === "SUCCEEDED") {
          setError(null);
          break;
        }
        if (status.parseStatus === "FAILED") {
          setError("Resume parsing failed. Upload a clean PDF and try again.");
          break;
        }
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to upload resume.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const onAnalyze = async () => {
    if (!lastResumeId) {
      setError("Upload a resume first before analysis.");
      return;
    }
    if (parseStatus !== "SUCCEEDED") {
      setError("Parsing is not complete yet. Wait until status is SUCCEEDED.");
      return;
    }

    setError(null);
    setAnalyzing(true);
    try {
      const result = await analyzeResume({
        resumeId: lastResumeId,
        jobRequirements,
        mode: "analyze",
      });
      setAnalysis(result);
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response
        ?.status;
      const apiMessage = (
        err as { response?: { data?: { message?: string } } }
      )?.response?.data?.message;
      const parseStatus = (
        err as { response?: { data?: { parseStatus?: string } } }
      )?.response?.data?.parseStatus;

      if (status === 404) {
        if (parseStatus === "FAILED") {
          setError(
            "Resume parsing failed. Please upload a clean PDF and retry."
          );
        } else {
          setError(
            "Resume parsing is still in progress. Wait a few seconds and try ATS analysis again."
          );
        }
      } else {
        setError(apiMessage ?? "Failed to analyze resume.");
      }
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <WorkspaceShell
      title="Resume AI"
      subtitle="Upload a resume and use AI-assisted screening insights before applying."
    >
      <section className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-900 px-6 py-8 text-white sm:px-8">
          <h1 className="text-3xl font-bold tracking-tight">Resume Intelligence</h1>
          <p className="mt-2 text-sm text-slate-200">
            Upload your resume in PDF format and run ATS analysis with structured insights.
          </p>
        </div>

        <div className="space-y-6 px-6 py-8 sm:px-8">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Max File Size
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{maxSizeLabel}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Parse Status
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{parseStatus}</p>
            </div>
          </div>

          {error ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </p>
          ) : null}

          <div className="rounded-xl border border-slate-200 p-5">
            <label htmlFor="resume-file" className="mb-2 block text-sm font-semibold text-slate-800">
              Resume File (PDF)
            </label>
            <input
              id="resume-file"
              type="file"
              accept=".pdf,application/pdf"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              onChange={(event) => {
                const selected = event.target.files?.[0] ?? null;
                setFile(selected);
                setError(null);
                setSuccess(null);
              }}
            />
            {file ? (
              <p className="mt-2 text-xs text-slate-500">
                Selected: {file.name} ({Math.ceil(file.size / 1024)} KB)
              </p>
            ) : null}

            <button
              type="button"
              onClick={onSubmit}
              disabled={loading || analyzing}
              className="mt-5 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
            >
              {loading ? "Uploading..." : "Upload Resume"}
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 p-5">
            <label
              htmlFor="job-requirements"
              className="mb-2 block text-sm font-semibold text-slate-800"
            >
              Job Requirements (Optional)
            </label>
            <textarea
              id="job-requirements"
              rows={5}
              value={jobRequirements}
              onChange={(event) => setJobRequirements(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="Paste required skills and job expectations for better ATS scoring."
            />

            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={onAnalyze}
                disabled={
                  !lastResumeId ||
                  loading ||
                  analyzing ||
                  parseStatus !== "SUCCEEDED"
                }
                className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {analyzing ? "Analyzing..." : "Analyze Resume (ATS)"}
              </button>
              {lastResumeId ? (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  Resume ID: {lastResumeId}
                </span>
              ) : null}
            </div>
          </div>

          {analysis ? (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-5 text-sm text-slate-800">
              <div className="flex items-center justify-between">
                <p className="text-base font-semibold text-slate-900">ATS Result</p>
                <p className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-semibold text-white">
                  Score {analysis.atsScore}/100
                </p>
              </div>
              <p className="mt-2 text-slate-600">Confidence: {analysis.confidence}</p>
              <p className="mt-4">
                <span className="font-semibold">Summary:</span> {analysis.summary}
              </p>
              <p className="mt-3">
                <span className="font-semibold text-emerald-700">Matched Skills:</span>{" "}
                {analysis.matchedSkills.length
                  ? analysis.matchedSkills.join(", ")
                  : "None identified"}
              </p>
              <p className="mt-2">
                <span className="font-semibold text-rose-700">Missing Skills:</span>{" "}
                {analysis.missingSkills.length
                  ? analysis.missingSkills.join(", ")
                  : "No gaps identified"}
              </p>
            </div>
          ) : null}
        </div>
      </section>
    </WorkspaceShell>
  );
}
