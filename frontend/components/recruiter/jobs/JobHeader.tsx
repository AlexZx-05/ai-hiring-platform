import Link from "next/link";
import { BarChart3, Briefcase, Plus, Users } from "lucide-react";

export default function JobHeader() {
  return (
    <section className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

        <div className="flex items-center gap-4">

          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">

            <Briefcase className="h-6 w-6 text-white"/>

          </div>

          <div>

            <h1 className="text-2xl font-bold">

              Job Management

            </h1>

            <p className="text-gray-500">

              Manage all job postings from one place.

            </p>

          </div>

        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/candidates"
            className="hidden items-center gap-2 rounded-lg border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 md:flex"
          >
            <Users size={16} />
            Candidates
          </Link>
          <Link
            href="/rankings"
            className="hidden items-center gap-2 rounded-lg border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 md:flex"
          >
            <BarChart3 size={16} />
            Leaderboard
          </Link>
          <Link
            href="/recruiter/jobs/create"
            className="rounded-lg bg-blue-600 px-5 py-3 text-white hover:bg-blue-700"
          >
            <div className="flex items-center gap-2">

              <Plus size={18}/>

              Create Job

            </div>
          </Link>
        </div>

      </div>
    </section>
  );
}
