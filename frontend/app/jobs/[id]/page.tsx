"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Briefcase, CheckCircle2, MapPin } from "lucide-react";
import ApplicationForm from "@/components/jobs/ApplicationForm";
import { getJob, type Job } from "@/services/jobs";

function getErrorMessage(error: unknown): string {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ?? "Unable to load this job."
  );
}

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [source, setSource] = useState<"api" | "demo">("api");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;

    let active = true;
    getJob(params.id)
      .then((result) => {
        if (!active) return;
        setJob(result.job);
        setSource(result.source);
      })
      .catch((reason) => active && setError(getErrorMessage(reason)))
      .finally(() => active && setLoading(false));

    return () => { active = false; };
  }, [params.id]);

  if (loading) {
    return <main className="min-h-screen bg-slate-50 p-6"><div className="mx-auto max-w-6xl rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading role...</div></main>;
  }

  if (!job) {
    return <main className="min-h-screen bg-slate-50 p-6"><div className="mx-auto max-w-6xl rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{error ?? "This role is not available."}</div></main>;
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-10 text-slate-900">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-5">
          <Link href="/jobs" className="mb-4 inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-900">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to jobs
          </Link>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-white"><Briefcase className="h-5 w-5" /></div>
                <div><h1 className="text-xl font-semibold">{job.title}</h1><p className="text-sm text-slate-500">{job.department}</p></div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
                <span className="rounded-md bg-slate-100 px-2 py-1">{job.employmentType}</span>
                <span className="rounded-md bg-slate-100 px-2 py-1">{job.workMode}</span>
                <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1"><MapPin className="h-3.5 w-3.5" />{job.location}</span>
                <span className="rounded-md bg-slate-100 px-2 py-1">{job.experienceLevel}</span>
              </div>
            </div>
            <Link href="/applications" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">My applications</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-5 py-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          {source === "demo" ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
              This is sample data. To submit applications, deploy the AWS API and open a recruiter-created job.
            </div>
          ) : <ApplicationForm job={job} />}
        </div>

        <aside className="space-y-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold">Role overview</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">{job.description}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold">Requirements</h2>
            <ul className="mt-3 space-y-2">
              {job.requirements.map((requirement) => <li key={requirement} className="flex gap-2 text-sm leading-5 text-slate-600"><CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-600" />{requirement}</li>)}
            </ul>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold">Skills</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {job.skills.map((skill) => <span key={skill} className="rounded-md bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700">{skill}</span>)}
            </div>
          </article>
        </aside>
      </section>
    </main>
  );
}
