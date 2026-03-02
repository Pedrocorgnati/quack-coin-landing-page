// lib/api/withAuth.ts
// HOC that wraps a Route Handler requiring an authenticated session.
// withAdmin additionally requires UserRole.ADMIN.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/config";
import type { Session } from "next-auth";

export type AuthedHandler = (
  request: NextRequest,
  context: { session: Session; params?: Record<string, string> },
) => Promise<NextResponse> | NextResponse;

export function withAuth(handler: AuthedHandler) {
  return async (request: NextRequest, ctx?: { params?: Record<string, string> }) => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return handler(request, { session, params: ctx?.params });
  };
}

export function withAdmin(handler: AuthedHandler) {
  return async (request: NextRequest, ctx?: { params?: Record<string, string> }) => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return handler(request, { session, params: ctx?.params });
  };
}
