"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import JobStats from "@/components/recruiter/jobs/JobStats";
import JobSearch from "@/components/recruiter/jobs/JobSearch";
import JobFilters from "@/components/recruiter/jobs/JobFilters";
import JobTable from "@/components/recruiter/jobs/JobTable";
import LoadingJobs from "@/components/recruiter/jobs/LoadingJobs";
import EmptyJobs from "@/components/recruiter/jobs/EmptyJobs";
import WorkspaceShell from "@/components/workspace/WorkspaceShell";
import { useRecruiterJobs } from "@/hooks/useRecruiterJobs";
import { updateRecruiterJobStatus } from "@/services/recruiter";
import type { Job } from "@/services/jobs";
import { useMemo, useState } from "react";

function getStatusUpdateError(error: unknown): string {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ??
    (error instanceof Error ? error.message : "Unable to update job status.")
  );
}

export default function RecruiterJobsPage() {
  const { jobs, loading, error, refresh } = useRecruiterJobs();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [statusError, setStatusError] = useState<string | null>(null);
  const [updatingJobId, setUpdatingJobId] = useState<string | null>(null);

  const filteredJobs = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const statusOrder: Record<Job["status"], number> = {
      OPEN: 0,
      DRAFT: 1,
      CLOSED: 2,
    };

    return jobs
      .filter((job) => {
        const matchesSearch =
          job.title.toLowerCase().includes(normalizedSearch) ||
          job.department.toLowerCase().includes(normalizedSearch) ||
          job.location.toLowerCase().includes(normalizedSearch);
        const matchesStatus = status === "" || job.status === status;
        return matchesSearch && matchesStatus;
      })
      .sort((left, right) => {
        const statusDifference = statusOrder[left.status] - statusOrder[right.status];
        if (statusDifference !== 0) return statusDifference;
        return Date.parse(right.updatedAt ?? right.createdAt) - Date.parse(left.updatedAt ?? left.createdAt);
      });
  }, [jobs, search, status]);

  const handleStatusChange = async (job: Job, nextStatus: Job["status"]) => {
    if (job.status === nextStatus) return;
    if (
      nextStatus === "CLOSED" &&
      !window.confirm(`Close "${job.title}"? Candidates will no longer be able to apply.`)
    ) {
      return;
    }

    setStatusError(null);
    setUpdatingJobId(job.jobId);
    try {
      await updateRecruiterJobStatus(job.jobId, nextStatus);
      await refresh();
    } catch (updateError) {
      setStatusError(getStatusUpdateError(updateError));
    } finally {
      setUpdatingJobId(null);
    }
  };

  return (
    <WorkspaceShell
      title="Job postings"
      subtitle="Create, publish, and manage your organization’s hiring pipeline."
      actions={
        <Link
          href="/recruiter/jobs/create"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800"
        >
          <Plus className="h-4 w-4" />
          Create job
        </Link>
      }
    >
      <section className="space-y-6">

        <JobStats jobs={jobs} />

        <JobSearch
          value={search}
          onChange={setSearch}
          onClear={() => setSearch("")}
        />

        <JobFilters
          status={status}
          onStatusChange={setStatus}
        />

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}
        {statusError ? (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {statusError}
          </div>
        ) : null}

        {loading ? (
          <LoadingJobs />
        ) : filteredJobs.length === 0 ? (
          <EmptyJobs />
        ) : (
          <JobTable
            jobs={filteredJobs}
            updatingJobId={updatingJobId}
            onStatusChange={(job, nextStatus) => void handleStatusChange(job, nextStatus)}
          />
        )}
      </section>
    </WorkspaceShell>
  );
}
