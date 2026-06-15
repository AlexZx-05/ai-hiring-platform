"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "react-oidc-context";
import {
  clearAuthArtifacts,
  getCognitoLogoutUrl,
  getUserRoleFromIdToken,
} from "@/services/auth";

const navItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/upload", label: "Upload" },
  { href: "/candidates", label: "Candidates" },
  { href: "/analytics", label: "Analytics" },
];

export function DashboardHeader() {
  const pathname = usePathname();
  const auth = useAuth();
  const role = getUserRoleFromIdToken(auth.user?.id_token);
  const userName =
    auth.user?.profile?.name ||
    auth.user?.profile?.email ||
    "Recruiter";
  const visibleNavItems =
    role === "candidate"
      ? navItems.filter((item) => item.href !== "/candidates" && item.href !== "/analytics")
      : navItems;

  const onLogout = async () => {
    clearAuthArtifacts();
    localStorage.setItem("auth_notice", "logged_out");
    auth.removeUser();
    window.location.href = getCognitoLogoutUrl();
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            Recruiter Dashboard
          </h1>
          <p className="text-sm text-slate-500">Signed in as {userName}</p>
        </div>
        <nav className="flex items-center gap-2 text-sm">
          {visibleNavItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-2 transition ${
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <button
            onClick={onLogout}
            className="ml-2 rounded-md bg-slate-900 px-3 py-2 text-white transition hover:bg-slate-700"
            type="button"
          >
            Logout
          </button>
        </nav>
      </div>
    </header>
  );
}
