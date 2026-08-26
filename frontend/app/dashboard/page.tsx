"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "react-oidc-context";
import { useEffect, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  FileSearch,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  PlusCircle,
  RefreshCw,
  Search,
  UploadCloud,
  Users,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  clearAuthArtifacts,
  getDemoSession,
  getEffectiveUserRole,
  getCognitoLogoutUrl,
} from "@/services/auth";
import { listApplications, listJobs, type Application, type Job } from "@/services/jobs";
import {
  listJobApplications,
  listRecruiterJobs,
  type RecruiterApplication,
} from "@/services/recruiter";

type DashboardData = {
  jobs: Job[];
  applications: Application[];
};

const emptyData: DashboardData = { jobs: [], applications: [] };

function getErrorMessage(error: unknown): string {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ?? "Dashboard data could not be loaded."
  );
}

function displayName(profile: Record<string, unknown> | undefined): string {
  const value = profile?.name ?? profile?.given_name ?? profile?.email;
  return typeof value === "string" && value.trim() ? value : "User";
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function lastSevenDays(applications: Application[]) {
  const formatter = new Intl.DateTimeFormat("en-IN", { weekday: "short" });
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    return {
      day: formatter.format(date),
      applications: applications.filter((item) => {
        const created = new Date(item.createdAt);
        return created >= date && created < next;
      }).length,
    };
  });
}

export default function DashboardPage() {
  const auth = useAuth();
  const pathname = usePathname();
  const [data, setData] = useState<DashboardData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const demoSession = getDemoSession();
  const hasWorkspaceSession = auth.isAuthenticated || Boolean(demoSession);
  const role = getEffectiveUserRole(auth.user?.id_token);
  const isRecruiter = role === "recruiter" || role === "admin";
  const name = demoSession?.name ?? displayName(auth.user?.profile as Record<string, unknown> | undefined);

  const loadDashboard = async () => {
    if (!hasWorkspaceSession) return;
    setLoading(true);
    setError(null);
    try {
      if (isRecruiter) {
        const jobs = await listRecruiterJobs();
        const results = await Promise.allSettled(
          jobs.map((job) => listJobApplications(job.jobId))
        );
        const applications = results.flatMap((result) =>
          result.status === "fulfilled" ? result.value : []
        );
        setData({ jobs, applications });
        if (results.some((result) => result.status === "rejected")) {
          setError("Some applicant records could not be loaded. The totals shown may be incomplete.");
        }
      } else {
        const [jobsResult, applications] = await Promise.all([
          listJobs(),
          listApplications(),
        ]);
        setData({ jobs: jobsResult.jobs, applications });
      }
    } catch (loadError) {
      setError(getErrorMessage(loadError));
      setData(emptyData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!auth.isLoading && hasWorkspaceSession) void loadDashboard();
  }, [auth.isLoading, hasWorkspaceSession, isRecruiter]);

  const navItems = isRecruiter
    ? [
        { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
        { label: "Job postings", href: "/recruiter/jobs", icon: BriefcaseBusiness },
        { label: "Candidates", href: "/candidates", icon: Users },
        { label: "Leaderboard", href: "/rankings", icon: FileSearch },
        { label: "Create job", href: "/recruiter/jobs/create", icon: PlusCircle },
      ]
    : [
        { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
        { label: "Find jobs", href: "/jobs", icon: Search },
        { label: "My applications", href: "/applications", icon: FileText },
        { label: "Resume analysis", href: "/upload", icon: UploadCloud },
      ];

  const jobById = useMemo(
    () => new Map(data.jobs.map((job) => [job.jobId, job])),
    [data.jobs]
  );
  const weekly = useMemo(() => lastSevenDays(data.applications), [data.applications]);
  const usingDemoData = useMemo(
    () =>
      data.jobs.some((job) => job.jobId.startsWith("job-demo-")) ||
      data.applications.some((application) => application.applicationId.startsWith("app-demo-")),
    [data.jobs, data.applications]
  );
  const recentApplications = useMemo(
    () =>
      [...data.applications]
        .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
        .slice(0, 5),
    [data.applications]
  );

  const metrics = isRecruiter
    ? [
        { label: "Active jobs", value: data.jobs.filter((job) => job.status === "OPEN").length, icon: BriefcaseBusiness },
        { label: "Total applicants", value: data.applications.length, icon: Users },
        { label: "Under review", value: data.applications.filter((item) => item.status === "UNDER_REVIEW").length, icon: FileSearch },
        { label: "Shortlisted", value: data.applications.filter((item) => item.status === "SHORTLISTED").length, icon: CheckCircle2 },
      ]
    : [
        { label: "Open jobs", value: data.jobs.filter((job) => job.status === "OPEN").length, icon: BriefcaseBusiness },
        { label: "Applications", value: data.applications.length, icon: FileText },
        { label: "In review", value: data.applications.filter((item) => ["PARSING", "UNDER_REVIEW"].includes(item.status)).length, icon: FileSearch },
        { label: "Shortlisted", value: data.applications.filter((item) => item.status === "SHORTLISTED").length, icon: CheckCircle2 },
      ];

  const logout = () => {
    clearAuthArtifacts();
    localStorage.setItem("auth_notice", "logged_out");
    void auth.removeUser();
    window.location.assign(demoSession ? "/login" : getCognitoLogoutUrl());
  };

  if (auth.isLoading || !hasWorkspaceSession) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">Loading your workspace...</div>;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {sidebarOpen ? (
        <button aria-label="Close navigation" className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      ) : null}

      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-slate-950 text-white transition-transform lg:sticky lg:top-0 lg:h-screen ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-5">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-blue-600"><BriefcaseBusiness className="h-4 w-4" /></div>
            <div className="min-w-0"><p className="truncate text-sm font-semibold">HireAI</p><p className="truncate text-xs text-slate-400">{isRecruiter ? "Recruiter workspace" : "Candidate workspace"}</p></div>
          </Link>
          <button aria-label="Close navigation" className="p-1 text-slate-400 lg:hidden" onClick={() => setSidebarOpen(false)}><X className="h-5 w-5" /></button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-5" aria-label="Dashboard navigation">
          {navItems.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
            return (
              <Link key={href} href={href} onClick={() => setSidebarOpen(false)} className={`flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition ${active ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}>
                <Icon className="h-4 w-4 flex-none" />{label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="mb-2 flex items-center gap-3 rounded-md px-2 py-2">
            <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-slate-700 text-xs font-semibold">{initials(name)}</div>
            <div className="min-w-0"><p className="truncate text-sm font-medium">{name}</p><p className="truncate text-xs capitalize text-slate-400">{role}</p></div>
          </div>
          <button type="button" onClick={logout} className="flex h-9 w-full items-center gap-3 rounded-md px-3 text-sm text-slate-300 hover:bg-white/10 hover:text-white"><LogOut className="h-4 w-4" />Sign out</button>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <button aria-label="Open navigation" className="rounded-md border border-slate-200 p-2 text-slate-600 lg:hidden" onClick={() => setSidebarOpen(true)}><Menu className="h-4 w-4" /></button>
            <div className="min-w-0"><h1 className="truncate text-lg font-semibold">{isRecruiter ? "Recruiter overview" : "Candidate overview"}</h1><p className="truncate text-xs text-slate-500">Welcome back, {name}</p></div>
          </div>
          <button type="button" onClick={() => void loadDashboard()} disabled={loading} title="Refresh dashboard" className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button>
        </header>

        <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-7">
          {error ? <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div> : null}
          {usingDemoData ? (
            <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              Live dashboard APIs are unavailable right now, so sample recruiter and candidate data is being shown.
            </div>
          ) : null}

          <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {metrics.map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
                <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-md bg-blue-50 text-blue-700"><Icon className="h-4 w-4" /></div>
                <p className="text-2xl font-semibold tabular-nums">{loading ? "-" : value}</p><p className="mt-1 text-xs text-slate-500">{label}</p>
              </div>
            ))}
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
            <div className="min-h-[330px] rounded-lg border border-slate-200 bg-white p-5">
              <div className="mb-5"><h2 className="text-sm font-semibold">Application activity</h2><p className="mt-1 text-xs text-slate-500">Applications recorded over the last seven days</p></div>
              <div className="h-[245px]">
                <ResponsiveContainer width="100%" height="100%"><BarChart data={weekly} barSize={24}><CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} /><Tooltip cursor={{ fill: "#f8fafc" }} contentStyle={{ border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12 }} /><Bar dataKey="applications" fill="#2563eb" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="mb-4 flex items-start justify-between"><div><h2 className="text-sm font-semibold">Recent applications</h2><p className="mt-1 text-xs text-slate-500">Latest status updates</p></div><Link href={isRecruiter ? "/recruiter/jobs" : "/applications"} className="text-xs font-semibold text-blue-700 hover:text-blue-800">View all</Link></div>
              {loading ? <p className="py-10 text-center text-sm text-slate-500">Loading activity...</p> : recentApplications.length ? (
                <div className="divide-y divide-slate-100">
                  {recentApplications.map((application) => {
                    const job = jobById.get(application.jobId);
                    const recruiterApplication = application as RecruiterApplication;
                    return (
                      <Link key={application.applicationId} href={isRecruiter ? `/recruiter/jobs/${application.jobId}` : `/jobs/${application.jobId}`} className="flex items-center gap-3 py-3 hover:bg-slate-50">
                        <div className="flex h-9 w-9 flex-none items-center justify-center rounded-md bg-slate-100 text-slate-600">{isRecruiter ? <CircleUserRound className="h-4 w-4" /> : <BriefcaseBusiness className="h-4 w-4" />}</div>
                        <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{isRecruiter ? recruiterApplication.candidateEmail ?? "Candidate" : job?.title ?? "Job application"}</p><p className="truncate text-xs text-slate-500">{job?.title ?? `Job ${application.jobId.slice(0, 8)}`} · {formatDate(application.updatedAt)}</p></div>
                        <span className="hidden rounded bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600 sm:block">{application.status.replaceAll("_", " ")}</span><ChevronRight className="h-4 w-4 flex-none text-slate-400" />
                      </Link>
                    );
                  })}
                </div>
              ) : <div className="py-12 text-center"><FileText className="mx-auto h-6 w-6 text-slate-300" /><p className="mt-3 text-sm font-medium">No applications yet</p><p className="mt-1 text-xs text-slate-500">New activity will appear here.</p></div>}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between"><div><h2 className="text-sm font-semibold">{isRecruiter ? "Recent job postings" : "Open opportunities"}</h2><p className="mt-1 text-xs text-slate-500">{isRecruiter ? "Jobs managed by your organization" : "Live roles available to your account"}</p></div><Link href={isRecruiter ? "/recruiter/jobs" : "/jobs"} className="text-xs font-semibold text-blue-700">View all</Link></div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {data.jobs.slice(0, 6).map((job) => <Link key={job.jobId} href={isRecruiter ? `/recruiter/jobs/${job.jobId}` : `/jobs/${job.jobId}`} className="rounded-md border border-slate-200 p-4 hover:border-blue-300"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{job.title}</p><p className="mt-1 truncate text-xs text-slate-500">{job.department} · {job.location}</p></div><span className="rounded bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">{job.status}</span></div></Link>)}
              {!loading && !data.jobs.length ? <p className="py-5 text-sm text-slate-500">No jobs are available.</p> : null}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
