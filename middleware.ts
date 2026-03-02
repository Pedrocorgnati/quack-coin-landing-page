// middleware.ts
// NextAuth session middleware — enforces authentication, admin guards, and 2FA guards.

import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { JWT } from "next-auth/jwt";

// Extend the NextAuth token to include our custom fields
type AuthToken = JWT & {
  role?: string;
  twoFactorEnabled?: boolean;
  twoFactorVerified?: boolean;
};

export default withAuth(
  function middleware(request: NextRequest) {
    const token = (request as NextRequest & { nextauth?: { token: AuthToken } })
      .nextauth?.token as AuthToken | null;

    const { pathname } = request.nextUrl;

    // ── Auth redirect guard (already logged in) ───────────────────
    // If user is authenticated and visiting an auth page, redirect to dashboard
    if (token && pathname.startsWith("/login") || token && pathname.startsWith("/register")) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // ── Admin guard ───────────────────────────────────────────────
    if (pathname.startsWith("/admin") && token?.role !== "ADMIN") {
      return NextResponse.redirect(
        new URL("/dashboard?error=unauthorized", request.url),
      );
    }

    // ── 2FA guard ─────────────────────────────────────────────────
    // If 2FA is enabled but not yet verified, force to challenge page
    if (
      token?.twoFactorEnabled &&
      !token?.twoFactorVerified &&
      !pathname.startsWith("/auth/2fa-challenge")
    ) {
      return NextResponse.redirect(new URL("/auth/2fa-challenge", request.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // Only run middleware for authenticated users
      authorized: ({ token }) => !!token,
    },
  },
);

export const config = {
  matcher: [
    // Protected route groups
    "/(dashboard)/:path*",
    "/dashboard/:path*",
    "/(admin)/:path*",
    "/admin/:path*",
    // Auth pages (for redirect-if-logged-in guard)
    "/login",
    "/register",
  ],
};
