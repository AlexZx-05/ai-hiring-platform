import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const protectedRoutes     = ["/dashboard", "/upload", "/candidates", "/jobs", "/applications", "/recruiter", "/analytics", "/rankings"];
  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));

  if (isProtected) {
    const token = request.cookies.get("auth_token");
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    /*
     * A role cookie is created in the browser and is neither signed nor
     * authoritative. Using it as a server-side authorization decision caused
     * valid users to be redirected to /dashboard when the cookie was stale.
     * The proxy establishes only that a session exists; every protected API
     * verifies the Cognito token and role before returning any tenant data.
     */
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
