"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "react-oidc-context";
import { ReactNode, useEffect, useState } from "react";
import {
  BarChart2,
  BriefcaseBusiness,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  PlusCircle,
  Search,
  UploadCloud,
  Users,
  UserPlus,
  X,
} from "lucide-react";
import {
  clearAuthArtifacts,
  getDemoSession,
  getEffectiveUserRole,
  getCognitoLogoutUrl,
} from "@/services/auth";

type WorkspaceShellProps = {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  children: ReactNode;
};

function displayName(profile: Record<string, unknown> | undefined): string {
  const value = profile?.name ?? profile?.given_name ?? profile?.email;

  return typeof value === "string" && value.trim()
    ? value
    : "User";
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function WorkspaceShell({
  title,
  subtitle,
  actions,
  children,
}: WorkspaceShellProps) {
  const auth = useAuth();
  const pathname = usePathname();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  /*
   * Important:
   * getDemoSession() may read browser-only data such as localStorage.
   * Therefore, do not call it directly during the initial render.
   * We load it after the component mounts to prevent hydration errors.
   */
  const [demoSession, setDemoSession] =
    useState<ReturnType<typeof getDemoSession>>(null);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDemoSession(getDemoSession());
  }, []);

  /*
   * Keep the first server render and first browser render identical.
   */
  const role = mounted
    ? getEffectiveUserRole(auth.user?.id_token)
    : "candidate";

  const isRecruiter =
    role === "recruiter" || role === "admin";

  /*
   * Do not read the demo session until the component has mounted.
   */
  const name = mounted
    ? demoSession?.name ??
      displayName(
        auth.user?.profile as
          | Record<string, unknown>
          | undefined
      )
    : "User";

  const navItems = isRecruiter
    ? [
        {
          label: "Overview",
          href: "/dashboard",
          icon: LayoutDashboard,
        },
        {
          label: "Job postings",
          href: "/recruiter/jobs",
          icon: BriefcaseBusiness,
        },
        {
          label: "Candidates",
          href: "/candidates",
          icon: Users,
        },
        {
          label: "Leaderboard",
          href: "/rankings",
          icon: BarChart2,
        },
        {
          label: "Create job",
          href: "/recruiter/jobs/create",
          icon: PlusCircle,
        },
        ...(role === "admin"
          ? [{ label: "Recruiter access", href: "/admin/recruiters", icon: UserPlus }]
          : []),
      ]
    : [
        {
          label: "Overview",
          href: "/dashboard",
          icon: LayoutDashboard,
        },
        {
          label: "Find jobs",
          href: "/jobs",
          icon: Search,
        },
        {
          label: "My applications",
          href: "/applications",
          icon: FileText,
        },
        {
          label: "Resume analysis",
          href: "/upload",
          icon: UploadCloud,
        },
      ];

  const activeHref = [...navItems]
    .filter(
      ({ href }) =>
        pathname === href ||
        (href !== "/dashboard" && pathname.startsWith(`${href}/`))
    )
    .sort((left, right) => right.href.length - left.href.length)[0]?.href;

  const logout = () => {
    clearAuthArtifacts();

    if (typeof localStorage !== "undefined") {
      localStorage.setItem("auth_notice", "logged_out");
    }

    void auth.removeUser();

    window.location.assign(
      demoSession
        ? "/login"
        : getCognitoLogoutUrl()
    );
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Mobile sidebar overlay */}
      {sidebarOpen ? (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-slate-950 text-white transition-transform lg:sticky lg:top-0 lg:h-screen ${
          sidebarOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Logo / Header */}
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-5">
          <Link
            href="/dashboard"
            className="flex min-w-0 items-center gap-3"
          >
            <div className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-blue-600">
              <BriefcaseBusiness className="h-4 w-4" />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                HireAI
              </p>

              <p className="truncate text-xs text-slate-400">
                {isRecruiter
                  ? "Recruiter workspace"
                  : "Candidate workspace"}
              </p>
            </div>
          </Link>

          <button
            aria-label="Close navigation"
            className="p-1 text-slate-400 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav
          className="flex-1 space-y-1 px-3 py-5"
          aria-label="Workspace navigation"
        >
          {navItems.map(
            ({ label, href, icon: Icon }) => {
              const active = href === activeHref;

              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() =>
                    setSidebarOpen(false)
                  }
                  className={`flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition ${
                    active
                      ? "bg-blue-600 text-white"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4 flex-none" />
                  {label}
                </Link>
              );
            }
          )}
        </nav>

        {/* User section */}
        <div className="border-t border-white/10 p-3">
          <div className="mb-2 flex items-center gap-3 rounded-md px-2 py-2">
            <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-slate-700 text-xs font-semibold">
              {initials(name)}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {name}
              </p>

              <p className="truncate text-xs capitalize text-slate-400">
                {role}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            className="flex h-9 w-full items-center gap-3 rounded-md px-3 text-sm text-slate-300 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="min-w-0 flex-1">
        {/* Top header */}
        <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <button
              aria-label="Open navigation"
              className="rounded-md border border-slate-200 p-2 text-slate-600 lg:hidden"
              onClick={() =>
                setSidebarOpen(true)
              }
            >
              <Menu className="h-4 w-4" />
            </button>

            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold">
                {title}
              </h1>

              <p className="truncate text-xs text-slate-500">
                {subtitle}
              </p>
            </div>
          </div>

          {actions ? (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          ) : null}
        </header>

        {/* Page content */}
        <div className="mx-auto max-w-7xl p-4 sm:p-7">
          {children}
        </div>
      </main>
    </div>
  );
}
