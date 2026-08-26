"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BriefcaseBusiness, MapPin } from "lucide-react";
import { getPublicJob, type Job } from "@/services/jobs";

export default function PublicCareerPage() {
  const params = useParams<{ tenant: string; slug: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.tenant || !params.slug) return;
    getPublicJob(params.tenant, params.slug).then(setJob).catch((reason) => {
      setError((reason as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "This opportunity is no longer available.");
    });
  }, [params.slug, params.tenant]);

  if (error) return <main className="mx-auto max-w-3xl p-8 text-sm text-rose-700">{error}</main>;
  if (!job) return <main className="mx-auto max-w-3xl p-8 text-sm text-slate-500">Loading opportunity…</main>;

  return <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-900"><article className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
    <div className="flex items-start gap-3"><div className="rounded-xl bg-slate-900 p-3 text-white"><BriefcaseBusiness className="h-5 w-5" /></div><div><h1 className="text-2xl font-bold">{job.title}</h1><p className="mt-1 text-sm text-slate-500">{job.department}</p></div></div>
    <p className="mt-5 flex items-center gap-1 text-sm text-slate-600"><MapPin className="h-4 w-4" />{job.location} · {job.workMode} · {job.employmentType}</p>
    <h2 className="mt-8 font-semibold">About the role</h2><p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">{job.description}</p>
    <h2 className="mt-7 font-semibold">Requirements</h2><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">{job.requirements.map((requirement) => <li key={requirement}>{requirement}</li>)}</ul>
    <Link href={`/signin?returnTo=${encodeURIComponent(`/jobs/${job.jobId}`)}`} className="mt-8 inline-flex rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800">Sign in to apply</Link>
  </article></main>;
}
