import { useEffect, useState } from "react";
import { listRecruiterJobs } from "@/services/recruiter";
import type { Job } from "@/services/jobs";

export function useRecruiterJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      setLoading(true);
      const data = await listRecruiterJobs();
      setJobs(data);
      setError(null);
    } catch {
      setError("Unable to load jobs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return {
    jobs,
    loading,
    error,
    refresh,
  };
}