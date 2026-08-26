import Link from "next/link";
import { Briefcase } from "lucide-react";

export default function EmptyJobs() {
  return (
    <div className="rounded-xl border bg-white py-16 text-center shadow-sm">
      <Briefcase className="mx-auto h-12 w-12 text-gray-400" />

      <h2 className="mt-4 text-xl font-semibold">
        No Jobs Found
      </h2>

      <p className="mt-2 text-gray-500">
        Create your first job posting to start hiring.
      </p>

      <Link
        href="/recruiter/jobs/create"
        className="mt-6 inline-flex rounded-lg bg-blue-600 px-5 py-3 text-white hover:bg-blue-700"
      >
        Create Job
      </Link>
    </div>
  );
}