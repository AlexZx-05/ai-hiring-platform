"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CircleHelp, Plus, Save, Trash2 } from "lucide-react";
import WorkspaceShell from "@/components/workspace/WorkspaceShell";
import { getJob, type Job, type ScreeningQuestion } from "@/services/jobs";
import { updateRecruiterJob, type CreateJobInput } from "@/services/recruiter";

type QuestionDraft = {
  key: string;
  prompt: string;
  required: boolean;
  type: ScreeningQuestion["type"];
  options: string;
};

function splitCsv(value: string): string[] {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function errorMessage(error: unknown): string {
  const response = (error as {
    response?: { status?: number; data?: { message?: unknown } };
  })?.response;
  const errorCode = (error as { code?: string })?.code;
  const isNetworkError =
    !response &&
    (errorCode === "ERR_NETWORK" ||
      (error instanceof Error && error.message.toLowerCase() === "network error"));
  const message = typeof response?.data?.message === "string"
    ? response.data.message
    : error instanceof Error
      ? error.message
      : "";

  if (isNetworkError) {
    return "The browser could not read a response from the API. Check your connection, API endpoint, and CORS configuration. Reload the job before retrying to verify whether the save completed.";
  }
  if (/invalid key=value pair|authorization header.*sha-256|aws4-hmac-sha256/i.test(message)) {
    return "The job edit endpoint is using the wrong API Gateway authorization mode. It must use the Cognito user-pool authorizer. Deploy the latest Terraform API changes, then sign out and sign back in.";
  }
  if (response?.status === 401) {
    return "Your sign-in session could not be verified. Sign out, sign back in, and try saving again.";
  }
  if (response?.status === 403) {
    return "You do not have permission to edit this job. Check that you are signed in with a recruiter account for this organization.";
  }
  if (response?.status && response.status >= 500) {
    return "The server could not confirm the save. Reload the job before trying again. If this continues, ask your administrator to check the jobs Lambda logs.";
  }

  return message || "Unable to save job details. Please try again.";
}

export default function EditRecruiterJobPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [location, setLocation] = useState("");
  const [employmentType, setEmploymentType] = useState("Full-time");
  const [workMode, setWorkMode] = useState<Job["workMode"]>("Hybrid");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [salaryRange, setSalaryRange] = useState("");
  const [skills, setSkills] = useState("");
  const [requirements, setRequirements] = useState("");
  const [description, setDescription] = useState("");
  const [screeningQuestions, setScreeningQuestions] = useState<QuestionDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    let active = true;
    setLoading(true);
    setError(null);
    setJob(null);
    getJob(params.id)
      .then(({ job: loadedJob }) => {
        if (!active) return;
        setJob(loadedJob);
        setTitle(loadedJob.title);
        setDepartment(loadedJob.department);
        setLocation(loadedJob.location);
        setEmploymentType(loadedJob.employmentType);
        setWorkMode(loadedJob.workMode);
        setExperienceLevel(loadedJob.experienceLevel);
        setSalaryRange(loadedJob.salaryRange ?? "");
        setSkills(loadedJob.skills.join(", "));
        setRequirements(loadedJob.requirements.join(", "));
        setDescription(loadedJob.description);
        setScreeningQuestions((loadedJob.screeningQuestions ?? []).map((question) => ({
          key: question.id || crypto.randomUUID(),
          prompt: question.prompt,
          required: question.required,
          type: question.type,
          options: question.options?.join(", ") ?? "",
        })));
      })
      .catch((loadError: unknown) => {
        if (active) setError(errorMessage(loadError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [params.id]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const incompleteQuestion = screeningQuestions.find((question) => !question.prompt.trim());
    if (incompleteQuestion) {
      setError("Write or remove each screening question before saving.");
      return;
    }
    if (screeningQuestions.some(
      (question) => question.type === "SELECT" && splitCsv(question.options).length < 2
    )) {
      setError("Multiple-choice questions need at least two comma-separated options.");
      return;
    }

    const payload: Omit<CreateJobInput, "status"> = {
      title,
      department,
      location,
      employmentType,
      workMode,
      experienceLevel,
      salaryRange,
      description,
      skills: splitCsv(skills),
      requirements: splitCsv(requirements),
      screeningQuestions: screeningQuestions.map((question) => ({
        prompt: question.prompt.trim(),
        required: question.required,
        type: question.type,
        ...(question.type === "SELECT" ? { options: splitCsv(question.options) } : {}),
      })),
    };

    setSaving(true);
    setError(null);
    try {
      await updateRecruiterJob(params.id, payload);
      router.push(`/recruiter/jobs/${params.id}`);
    } catch (saveError: unknown) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const addQuestion = () => setScreeningQuestions((current) => [
    ...current,
    { key: crypto.randomUUID(), prompt: "", required: true, type: "TEXT", options: "" },
  ]);
  const updateQuestion = (key: string, changes: Partial<QuestionDraft>) =>
    setScreeningQuestions((current) => current.map((question) =>
      question.key === key ? { ...question, ...changes } : question
    ));

  return (
    <WorkspaceShell
      title="Edit job posting"
      subtitle={job ? `Update the details and criteria for ${job.title}.` : "Update job details and criteria."}
    >
      <section className="max-w-5xl space-y-4">
        <Link
          href={`/recruiter/jobs/${params.id}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to applicants
        </Link>

        {error ? (
          <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}
        {job ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
            Existing applicant scores and reports will stay unchanged. They will be labeled if they were generated using earlier job criteria.
          </p>
        ) : null}

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading job details…</div>
        ) : job ? (
          <form onSubmit={(event) => void onSubmit(event)} className="rounded-xl border border-gray-100 bg-white p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Job Title" value={title} onChange={setTitle} required />
              <Field label="Company / Department" value={department} onChange={setDepartment} required />
              <Field label="Location" value={location} onChange={setLocation} required />
              <Field label="Experience" value={experienceLevel} onChange={setExperienceLevel} placeholder="2-4 years" />
              <Field label="Employment Type" value={employmentType} onChange={setEmploymentType} />
              <label className="block text-xs font-semibold text-gray-700">
                Work Mode
                <select
                  value={workMode}
                  onChange={(event) => setWorkMode(event.target.value as Job["workMode"])}
                  className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option>Hybrid</option>
                  <option>Remote</option>
                  <option>On-site</option>
                </select>
              </label>
              <Field label="Salary Range" value={salaryRange} onChange={setSalaryRange} placeholder="Optional" />
              <Field label="Skills Required" value={skills} onChange={setSkills} placeholder="Node.js, AWS, Docker" />
            </div>

            <TextArea label="Requirements" value={requirements} onChange={setRequirements} rows={3} placeholder="Comma separated requirements" />

            <section className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex gap-2">
                  <CircleHelp className="mt-0.5 h-4 w-4 flex-none text-blue-700" />
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">Job screening questions</h2>
                    <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-600">
                      Ask up to eight job-relevant questions. Do not request protected or sensitive personal information.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={screeningQuestions.length >= 8}
                  onClick={addQuestion}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5" /> Add question
                </button>
              </div>
              <div className="mt-4 space-y-3">
                {screeningQuestions.map((question, index) => (
                  <div key={question.key} className="rounded-lg border border-slate-200 bg-white p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold text-slate-700">Question {index + 1}</p>
                      <button
                        type="button"
                        onClick={() => setScreeningQuestions((current) => current.filter((item) => item.key !== question.key))}
                        className="inline-flex items-center gap-1 text-xs font-medium text-rose-700 hover:text-rose-800"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remove
                      </button>
                    </div>
                    <input
                      value={question.prompt}
                      onChange={(event) => updateQuestion(question.key, { prompt: event.target.value })}
                      placeholder="Write a job-related question"
                      className="mt-3 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                    <div className="mt-3 grid gap-3 sm:grid-cols-[160px_1fr_auto] sm:items-center">
                      <select
                        value={question.type}
                        onChange={(event) => updateQuestion(question.key, { type: event.target.value as QuestionDraft["type"] })}
                        className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="TEXT">Written response</option>
                        <option value="YES_NO">Yes / No</option>
                        <option value="SELECT">Multiple choice</option>
                      </select>
                      {question.type === "SELECT" ? (
                        <input
                          value={question.options}
                          onChange={(event) => updateQuestion(question.key, { options: event.target.value })}
                          placeholder="Option 1, Option 2"
                          className="h-9 rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                      ) : <span className="text-xs text-slate-500">{question.type === "YES_NO" ? "Candidate selects Yes or No." : "Candidate can write a response."}</span>}
                      <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={question.required}
                          onChange={(event) => updateQuestion(question.key, { required: event.target.checked })}
                          className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-500"
                        />
                        Required
                      </label>
                    </div>
                  </div>
                ))}
                {!screeningQuestions.length ? <p className="text-xs text-slate-500">No extra screening questions.</p> : null}
              </div>
            </section>

            <TextArea label="Description" value={description} onChange={setDescription} rows={7} placeholder="Full job description" required />
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:bg-blue-300"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving…" : "Save changes"}
              </button>
              <Link href={`/recruiter/jobs/${params.id}`} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Cancel
              </Link>
            </div>
          </form>
        ) : !error ? (
          <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Job not found.</p>
        ) : null}
      </section>
    </WorkspaceShell>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-xs font-semibold text-gray-700">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="mt-4 block text-xs font-semibold text-gray-700">
      {label}
      <textarea
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="mt-2 w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}
