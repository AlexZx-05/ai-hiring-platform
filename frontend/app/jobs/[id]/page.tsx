"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  FileText,
  Info,
  Loader2,
  MapPin,
  ShieldCheck,
  Send,
  UploadCloud,
} from "lucide-react";
import { getJob, createApplication, type Job } from "@/services/jobs";
import { requestResumeUploadUrl, uploadResumeToS3 } from "@/services/upload";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [source, setSource] = useState<"api" | "demo">("api");
  const [file, setFile] = useState<File | null>(null);
  const [coverNote, setCoverNote] = useState("");
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [resumeObjectKey, setResumeObjectKey] = useState<string | null>(null);
  const [parseStatus, setParseStatus] = useState<string>("IDLE");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;

    let mounted = true;
    getJob(params.id)
      .then((result) => {
        if (!mounted) return;
        setJob(result.job);
        setSource(result.source);
      })
      .catch((err) => {
        if (!mounted) return;
        const message =
          (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message ?? "Unable to load this job.";
        setError(message);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [params.id]);

  const submitApplication = async () => {
    setError(null);
    setSuccess(null);
    setInfo(null);

    if (!job) {
      setError("Job details are still loading.");
      return;
    }
    if (source === "demo") {
      setError("This sample job cannot accept applications until the jobs API is deployed.");
      return;
    }
    if (!file) {
      setError("Select a PDF resume before applying.");
      return;
    }
    if (file.type !== "application/pdf") {
      setError("Only PDF resumes are supported.");
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError("Resume must be 5MB or less.");
      return;
    }

    setSubmitting(true);
    try {
      setParseStatus("UPLOADING");
      const presign = await requestResumeUploadUrl({
        fileName: file.name,
        contentType: file.type,
        sizeBytes: file.size,
      });
      await uploadResumeToS3(presign.uploadUrl, file);
      setResumeId(presign.resumeId);
      setResumeObjectKey(presign.objectKey);
      setParseStatus("PENDING");

      if (!job.publicTenantSlug || !job.publicSlug) {
        throw new Error("This job is missing its public application identity. Refresh after the jobs API is deployed.");
      }
      const application = await createApplication({
        jobId: job.jobId,
        publicTenantSlug: job.publicTenantSlug,
        publicSlug: job.publicSlug,
        resumeId: presign.resumeId,
        resumeObjectKey: presign.objectKey,
        coverNote,
      });

      setSuccess(`Application submitted. Tracking ID: ${application.applicationId}`);
      setInfo("Resume uploaded. AI parsing and ranking will continue in the background.");
      setFile(null);
      setCoverNote("");

      setInfo("Application submitted. Resume parsing and job-specific AI screening continue securely in the background. Check My Applications for updates.");
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to submit application.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-5xl rounded-xl border border-gray-100 bg-white p-6 text-sm text-gray-500">
          Loading job...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-5xl px-5 py-5">
          <Link href="/jobs" className="mb-4 flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-900">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to jobs
          </Link>
          {job ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-700">
                    <Briefcase className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-semibold text-gray-900">{job.title}</h1>
                    <p className="text-xs text-gray-500">{job.department}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-600">
                  <span className="rounded-md bg-gray-100 px-2 py-1">{job.employmentType}</span>
                  <span className="rounded-md bg-gray-100 px-2 py-1">{job.workMode}</span>
                  <span className="flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {job.location}
                  </span>
                  <span className="rounded-md bg-gray-100 px-2 py-1">{job.experienceLevel}</span>
                </div>
              </div>
              <Link
                href="/applications"
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                My Applications
              </Link>
            </div>
          ) : null}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 py-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {!job ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
            {error ?? "Job not found."}
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {source === "demo" ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  This is a sample job. Deploy the jobs API before accepting applications.
                </div>
              ) : null}
              <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-gray-900">Role Overview</h2>
                <p className="mt-3 text-sm leading-6 text-gray-600">{job.description}</p>
              </article>
              <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-gray-900">Requirements</h2>
                <ul className="mt-3 space-y-2">
                  {job.requirements.map((item) => (
                    <li key={item} className="flex gap-2 text-sm text-gray-600">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
              <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-gray-900">Skills</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {job.skills.map((skill) => (
                    <span key={skill} className="rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                      {skill}
                    </span>
                  ))}
                </div>
              </article>
            </div>

            <aside className="sticky top-5 h-fit rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                  <UploadCloud className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Upload your resume</h2>
                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    Submit a PDF resume for AI matching against this job description.
                  </p>
                </div>
              </div>

              {error ? (
                <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}
              {success ? (
                <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                  {success}
                </div>
              ) : null}
              {info ? (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
                  <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{info}</span>
                </div>
              ) : null}

              <label className="mt-5 block text-xs font-semibold text-gray-700">
                Resume PDF
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  disabled={submitting}
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-blue-700"
                />
              </label>
              {file ? (
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
                  <FileText className="h-3.5 w-3.5 flex-none text-gray-500" />
                  <span className="min-w-0 flex-1 truncate">{file.name}</span>
                  <span className="font-semibold">{Math.ceil(file.size / 1024)} KB</span>
                </div>
              ) : null}

              <label className="mt-4 block text-xs font-semibold text-gray-700">
                Cover Note
                <textarea
                  rows={5}
                  value={coverNote}
                  disabled={submitting}
                  onChange={(event) => setCoverNote(event.target.value)}
                  className="mt-2 w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="Add a short note for the recruiter."
                />
              </label>

              <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-xs text-gray-600">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 font-semibold text-gray-900">
                    <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
                    Screening status
                  </span>
                  <span className="rounded-md bg-white px-2 py-1 font-semibold text-gray-700">{parseStatus}</span>
                </div>
                {resumeId ? <div className="mt-2 break-all">Resume ID: {resumeId}</div> : null}
                {resumeObjectKey ? <div className="mt-1 truncate">Storage key: {resumeObjectKey}</div> : null}
              </div>

              <button
                type="button"
                onClick={submitApplication}
                disabled={submitting || source === "demo"}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {submitting ? "Submitting..." : "Submit Application"}
              </button>
            </aside>
          </>
        )}
      </section>
    </main>
  );
}
