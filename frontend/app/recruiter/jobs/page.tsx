"use client";

import JobHeader from "@/components/recruiter/jobs/JobHeader";
import JobStats from "@/components/recruiter/jobs/JobStats";
import JobSearch from "@/components/recruiter/jobs/JobSearch";
import JobFilters from "@/components/recruiter/jobs/JobFilters";
import JobTable from "@/components/recruiter/jobs/JobTable";
import LoadingJobs from "@/components/recruiter/jobs/LoadingJobs";
import EmptyJobs from "@/components/recruiter/jobs/EmptyJobs";
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
    <main className="min-h-screen bg-gray-50">

      <JobHeader />

      <section className="mx-auto max-w-7xl space-y-6 px-6 py-6">

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

    </main>
  );
}