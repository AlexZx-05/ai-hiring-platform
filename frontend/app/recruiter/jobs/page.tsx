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
import { useMemo, useState } from "react";

export default function RecruiterJobsPage() {
  const { jobs, loading, error, refresh } = useRecruiterJobs();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const matchesSearch =
        job.title.toLowerCase().includes(search.toLowerCase()) ||
        job.department.toLowerCase().includes(search.toLowerCase()) ||
        job.location.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        status === "" || job.status === status;

      return matchesSearch && matchesStatus;
    });
  }, [jobs, search, status]);

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

        {loading ? (
          <LoadingJobs />
        ) : filteredJobs.length === 0 ? (
          <EmptyJobs />
        ) : (
          <JobTable
            jobs={filteredJobs}
            onRefresh={refresh}
          />
        )}
      </section>
    </WorkspaceShell>
  );
}
