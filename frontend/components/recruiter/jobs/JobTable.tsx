import type { Job } from "@/services/jobs";

type Props = {
  jobs: Job[];
  onRefresh: () => void;
};

export default function JobTable({ jobs }: Props) {
  return (
    <div className="rounded-xl border bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold">Jobs</h2>

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b">
            <th className="p-3 text-left">Title</th>
            <th className="p-3 text-left">Department</th>
            <th className="p-3 text-left">Location</th>
            <th className="p-3 text-left">Status</th>
          </tr>
        </thead>

        <tbody>
          {jobs.map((job) => (
            <tr key={job.jobId} className="border-b">
              <td className="p-3">{job.title}</td>
              <td className="p-3">{job.department}</td>
              <td className="p-3">{job.location}</td>
              <td className="p-3">{job.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}