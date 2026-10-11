import Link from "next/link";
import { ArrowUpRight, BriefcaseBusiness, MapPin, Pencil } from "lucide-react";
import type { Job } from "@/services/jobs";

type Props = {
  jobs: Job[];
  updatingJobId: string | null;
  onStatusChange: (job: Job, status: Job["status"]) => void;
};

const statusStyles: Record<Job["status"], string> = {
  OPEN: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  DRAFT: "bg-amber-50 text-amber-800 ring-amber-600/20",
  CLOSED: "bg-slate-100 text-slate-700 ring-slate-600/20",
};

export default function JobTable({
  jobs,
  updatingJobId,
  onStatusChange,
}: Props) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-base font-semibold text-slate-900">Jobs</h2>
        <p className="mt-1 text-sm text-slate-500">
          Manage each role and control whether candidates can apply.
        </p>
      </div>

      <div className="divide-y divide-slate-100">
        {jobs.map((job) => (
          <article
            key={job.jobId}
            className="grid gap-4 px-5 py-5 lg:grid-cols-[minmax(220px,1.6fr)_minmax(130px,1fr)_minmax(140px,1fr)_minmax(140px,auto)_auto] lg:items-center"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                  <BriefcaseBusiness className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-slate-900">{job.title}</h3>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {job.employmentType} · {job.workMode}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Department</p>
              <p className="mt-1 text-sm text-slate-700">{job.department}</p>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Location</p>
              <p className="mt-1 flex items-center gap-1 text-sm text-slate-700">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                {job.location}
              </p>
            </div>

            <div>
              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusStyles[job.status]}`}>
                {job.status === "OPEN" ? "Open" : job.status === "DRAFT" ? "Draft" : "Closed"}
              </span>
              <label className="mt-2 block">
                <span className="sr-only">Change status for {job.title}</span>
                <select
                  value={job.status}
                  disabled={updatingJobId === job.jobId}
                  onChange={(event) => {
                    const nextStatus = event.currentTarget.value;
                    if (nextStatus === "OPEN" || nextStatus === "DRAFT" || nextStatus === "CLOSED") {
                      onStatusChange(job, nextStatus);
                    }
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-wait disabled:opacity-60"
                >
                  <option value="OPEN">Open - accepting applications</option>
                  <option value="DRAFT">Draft - not published</option>
                  <option value="CLOSED">Closed - no new applications</option>
                </select>
              </label>
              {updatingJobId === job.jobId ? (
                <p className="mt-1 text-[11px] text-slate-500" role="status">Saving status…</p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/recruiter/jobs/${job.jobId}/edit`}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit details
              </Link>
              <Link
                href={`/recruiter/jobs/${job.jobId}`}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              >
                Review applicants
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}