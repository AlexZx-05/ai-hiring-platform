"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Briefcase, Save } from "lucide-react";
import { createRecruiterJob } from "@/services/recruiter";
import type { Job } from "@/services/jobs";

function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
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
    <main className="min-h-screen bg-gray-50">
      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-5xl px-5 py-5">
          <Link href="/recruiter/jobs" className="mb-4 flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-900">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to recruiter jobs
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-700">
              <Briefcase className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Create Job Posting</h1>
              <p className="text-xs text-gray-500">Publish a role candidates can apply to.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-6">
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
    </main>
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
