"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CheckCircle2,
  FileText,
  Loader2,
  Send,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { createApplication, type Job } from "@/services/jobs";
import { requestResumeUploadUrl, uploadResumeToS3 } from "@/services/upload";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

type ApplicationFormProps = {
  job: Job;
};

function errorMessage(error: unknown): string {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ?? "We could not submit your application. Please try again."
  );
}

export default function ApplicationForm({ job }: ApplicationFormProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [coverNote, setCoverNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applicationId, setApplicationId] = useState<string | null>(null);

  const questions = job.screeningQuestions ?? [];
  const requiredQuestionsComplete = questions
    .filter((question) => question.required)
    .every((question) => answers[question.id]?.trim());

  const submit = async () => {
    setError(null);

    if (!file) {
      setError("Please select your resume before submitting.");
      return;
    }
    if (file.type !== "application/pdf") {
      setError("Please upload your resume as a PDF.");
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError("Your resume must be 5 MB or smaller.");
      return;
    }
    if (!requiredQuestionsComplete) {
      setError("Please complete every required screening question.");
      return;
    }
    if (!job.publicTenantSlug || !job.publicSlug) {
      setError("This job link is incomplete. Please contact the recruiter for a new link.");
      return;
    }

    setSubmitting(true);
    try {
      const upload = await requestResumeUploadUrl({
        fileName: file.name,
        contentType: file.type,
        sizeBytes: file.size,
      });
      await uploadResumeToS3(upload.uploadUrl, file);

      const application = await createApplication({
        jobId: job.jobId,
        publicTenantSlug: job.publicTenantSlug,
        publicSlug: job.publicSlug,
        resumeId: upload.resumeId,
        resumeObjectKey: upload.objectKey,
        coverNote: coverNote.trim() || undefined,
        screeningAnswers: questions
          .map((question) => ({
            questionId: question.id,
            answer: answers[question.id]?.trim() ?? "",
          }))
          .filter((answer) => answer.answer),
      });

      setApplicationId(application.applicationId);
      setFile(null);
    } catch (submitError) {
      setError(errorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  if (applicationId) {
    return (
      <section className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <div className="flex gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-emerald-700" />
          <div>
            <h2 className="text-base font-semibold text-emerald-950">Application submitted</h2>
            <p className="mt-1 text-sm leading-6 text-emerald-900">
              Your resume is now being parsed and matched to this role. We will show each next step in your application tracker.
            </p>
            <p className="mt-3 text-xs font-medium text-emerald-800">Reference: {applicationId}</p>
            <Link
              href="/applications"
              className="mt-5 inline-flex rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              View application progress
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="application-form-heading" className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-950 px-5 py-5 text-white sm:px-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-white/10">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h2 id="application-form-heading" className="text-base font-semibold">Apply for {job.title}</h2>
            <p className="mt-1 text-sm text-slate-300">Complete the questions, attach your resume, and submit one secure application.</p>
          </div>
        </div>
        <ol className="mt-5 grid gap-2 text-xs sm:grid-cols-3">
          <li className="rounded-lg bg-white/10 px-3 py-2"><span className="font-semibold text-white">1. Screening</span><span className="ml-2 text-slate-300">Job-fit context</span></li>
          <li className="rounded-lg bg-white/10 px-3 py-2"><span className="font-semibold text-white">2. Resume</span><span className="ml-2 text-slate-300">PDF, up to 5 MB</span></li>
          <li className="rounded-lg bg-white/10 px-3 py-2"><span className="font-semibold text-white">3. Tracking</span><span className="ml-2 text-slate-300">Updates in one place</span></li>
        </ol>
      </div>

      <div className="space-y-6 p-5 sm:p-6">
        {error ? <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div> : null}

        {questions.length ? (
          <fieldset>
            <legend className="text-sm font-semibold text-slate-900">A few questions from the hiring team</legend>
            <p className="mt-1 text-xs leading-5 text-slate-500">Answer only job-related questions. Required answers are marked with an asterisk.</p>
            <div className="mt-4 space-y-5">
              {questions.map((question, index) => {
                const id = `screening-${question.id}`;
                const label = `${index + 1}. ${question.prompt}`;
                const commonProps = {
                  id,
                  value: answers[question.id] ?? "",
                  onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
                    setAnswers((current) => ({ ...current, [question.id]: event.target.value })),
                  required: question.required,
                  className: "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100",
                };

                return (
                  <div key={question.id}>
                    <label htmlFor={id} className="block text-sm font-medium text-slate-800">
                      {label}{question.required ? <span className="ml-1 text-rose-600">*</span> : null}
                    </label>
                    {question.type === "TEXT" ? (
                      <textarea {...commonProps} rows={4} maxLength={2000} placeholder="Write your response" />
                    ) : question.type === "YES_NO" ? (
                      <select {...commonProps}>
                        <option value="">Select an answer</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    ) : (
                      <select {...commonProps}>
                        <option value="">Select an answer</option>
                        {(question.options ?? []).map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    )}
                  </div>
                );
              })}
            </div>
          </fieldset>
        ) : null}

        <div className="border-t border-slate-100 pt-6">
          <label htmlFor="application-resume" className="block text-sm font-semibold text-slate-900">Resume (PDF) <span className="font-normal text-slate-500">— required</span></label>
          <div className="mt-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
            <div className="flex gap-3">
              <UploadCloud className="mt-0.5 h-5 w-5 flex-none text-blue-700" />
              <div className="min-w-0 flex-1">
                <input
                  id="application-resume"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-700 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-blue-800"
                />
                <p className="mt-2 text-xs text-slate-500">PDF only, maximum file size 5 MB. Your file is stored securely for this application.</p>
                {file ? <p className="mt-2 truncate text-xs font-medium text-slate-700">Selected: {file.name}</p> : null}
              </div>
            </div>
          </div>
        </div>

        <label htmlFor="application-note" className="block text-sm font-semibold text-slate-900">
          Short note <span className="font-normal text-slate-500">(optional)</span>
          <textarea
            id="application-note"
            value={coverNote}
            onChange={(event) => setCoverNote(event.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="Tell the hiring team why this role is a good fit."
            className="mt-2 w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <div className="rounded-xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
          <ShieldCheck className="mr-2 inline h-4 w-4 text-emerald-700" />
          Your application is scored against this role only. The hiring team makes the final decision; the AI score is one review signal, not an automatic decision.
        </div>

        <button
          type="button"
          disabled={submitting}
          onClick={() => void submit()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-300 sm:w-auto"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {submitting ? "Submitting application..." : "Submit application"}
        </button>
      </div>
    </section>
  );
}
