import { Briefcase, Users, CheckCircle, Clock } from "lucide-react";
import type { Job } from "@/services/jobs";

type JobStatsProps = {
  jobs: Job[];
};

export default function JobStats({ jobs }: JobStatsProps) {
  const activeJobs = jobs.filter((job) => job.status === "OPEN").length;
  const draftJobs = jobs.filter((job) => job.status === "DRAFT").length;
  const closedJobs = jobs.filter((job) => job.status === "CLOSED").length;

  const stats = [
    {
      title: "Active Jobs",
      value: activeJobs,
      icon: Briefcase,
    },
    {
      title: "Draft Jobs",
      value: draftJobs,
      icon: Clock,
    },
    {
      title: "Closed Jobs",
      value: closedJobs,
      icon: CheckCircle,
    },
    {
      title: "Total Jobs",
      value: jobs.length,
      icon: Users,
    },
  ];

  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
      {stats.map((item) => {
        const Icon = item.icon;

        return (
          <div
            key={item.title}
            className="rounded-xl border bg-white p-6 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <Icon className="h-6 w-6 text-blue-600" />
              <span className="text-3xl font-bold">{item.value}</span>
            </div>

            <p className="mt-4 text-gray-500">{item.title}</p>
          </div>
        );
      })}
    </div>
  );
}