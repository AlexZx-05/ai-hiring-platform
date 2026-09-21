"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleHelp, Plus, Save, Trash2 } from "lucide-react";
import WorkspaceShell from "@/components/workspace/WorkspaceShell";
import { createRecruiterJob } from "@/services/recruiter";
import type { Job, ScreeningQuestion } from "@/services/jobs";

function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

type QuestionDraft = {
  key: string;
  prompt: string;
  required: boolean;
  type: ScreeningQuestion["type"];
  options: string;
};

function newQuestion(): QuestionDraft {
  return {
    key: crypto.randomUUID(),
    prompt: "",
    required: true,
    type: "TEXT",
    options: "",
  };
}

export default function CreateRecruiterJobPage() {
  const router = useRouter();
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    const incompleteQuestion = screeningQuestions.find((question) => !question.prompt.trim());
    if (incompleteQuestion) {
      setError("Write or remove each screening question before publishing.");
      return;
    }
    const invalidSelect = screeningQuestions.find(
      (question) => question.type === "SELECT" && splitCsv(question.options).length < 2
    );
    if (invalidSelect) {
      setError("Multiple-choice questions need at least two comma-separated options.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const job = await createRecruiterJob({
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
        status: "OPEN",
      });
      router.push(`/recruiter/jobs/${job.jobId}`);
    } catch (err) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Unable to create job."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <WorkspaceShell
      title="Create job posting"
      subtitle="Publish a role, define the criteria, and add job-relevant screening questions."
    >
      <section className="max-w-5xl">
        <div className="rounded-xl border border-gray-100 bg-white p-5">
          {error ? (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Job Title" value={title} onChange={setTitle} />
            <Field label="Company / Department" value={department} onChange={setDepartment} />
            <Field label="Location" value={location} onChange={setLocation} />
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

          <label className="mt-4 block text-xs font-semibold text-gray-700">
            Requirements
            <textarea
              rows={3}
              value={requirements}
              onChange={(event) => setRequirements(event.target.value)}
              className="mt-2 w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="Comma separated requirements"
            />
          </label>

          <section className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-2">
                <CircleHelp className="mt-0.5 h-4 w-4 flex-none text-blue-700" />
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Job screening questions</h2>
                  <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-600">
                    Ask up to eight job-relevant questions before candidates upload their resume. Do not request protected or sensitive personal information.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={screeningQuestions.length >= 8}
                onClick={() => setScreeningQuestions((current) => [...current, newQuestion()])}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Add question
              </button>
            </div>

            {screeningQuestions.length ? (
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
                      onChange={(event) => setScreeningQuestions((current) => current.map((item) => item.key === question.key ? { ...item, prompt: event.target.value } : item))}
                      placeholder="For example: Briefly describe the most relevant project you have delivered."
                      className="mt-3 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                    <div className="mt-3 grid gap-3 sm:grid-cols-[160px_1fr_auto] sm:items-center">
                      <select
                        value={question.type}
                        onChange={(event) => setScreeningQuestions((current) => current.map((item) => item.key === question.key ? { ...item, type: event.target.value as QuestionDraft["type"] } : item))}
                        className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="TEXT">Written response</option>
                        <option value="YES_NO">Yes / No</option>
                        <option value="SELECT">Multiple choice</option>
                      </select>
                      {question.type === "SELECT" ? (
                        <input
                          value={question.options}
                          onChange={(event) => setScreeningQuestions((current) => current.map((item) => item.key === question.key ? { ...item, options: event.target.value } : item))}
                          placeholder="Option 1, Option 2, Option 3"
                          className="h-9 rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                      ) : <span className="text-xs text-slate-500">{question.type === "YES_NO" ? "Candidate selects Yes or No." : "Candidate can write up to 2,000 characters."}</span>}
                      <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={question.required}
                          onChange={(event) => setScreeningQuestions((current) => current.map((item) => item.key === question.key ? { ...item, required: event.target.checked } : item))}
                          className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-500"
                        />
                        Required
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-xs text-slate-500">No extra questions. Candidates will move directly to their resume and cover note.</p>
            )}
          </section>

          <label className="mt-4 block text-xs font-semibold text-gray-700">
            Description
            <textarea
              rows={7}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="mt-2 w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="Full job description"
            />
          </label>

          <button
            type="button"
            onClick={onSubmit}
            disabled={saving}
            className="mt-5 flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:bg-blue-300"
          >
            <Save className="h-4 w-4" />
            {saving ? "Publishing..." : "Publish Job"}
          </button>
        </div>
      </section>
    </WorkspaceShell>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block text-xs font-semibold text-gray-700">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}
