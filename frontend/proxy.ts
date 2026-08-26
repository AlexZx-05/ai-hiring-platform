import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const protectedRoutes     = ["/dashboard", "/upload", "/candidates", "/jobs", "/applications", "/recruiter", "/analytics", "/rankings"];
  const recruiterOnlyRoutes = ["/recruiter", "/candidates", "/analytics", "/rankings"];
  const candidateOnlyRoutes = ["/upload", "/jobs", "/applications"];

  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));

  if (isProtected) {
    const token = request.cookies.get("auth_token");
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const isRecruiterOnly = recruiterOnlyRoutes.some((route) =>
      pathname.startsWith(route)
    );
    if (isRecruiterOnly) {
      const role = request.cookies.get("user_role")?.value ?? "candidate";
      const allowedRoles = new Set(["recruiter", "admin"]);
      if (!allowedRoles.has(role)) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }

    const isCandidateOnly = candidateOnlyRoutes.some((route) =>
      pathname.startsWith(route)
    );
    if (isCandidateOnly) {
      const role = request.cookies.get("user_role")?.value ?? "candidate";
      if (role !== "candidate" && role !== "admin") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/upload/:path*",
    "/candidates/:path*",
    "/jobs/:path*",
    "/applications/:path*",
    "/recruiter/:path*",
    "/analytics/:path*",
    "/rankings/:path*",
  ],
};
