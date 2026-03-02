// lib/csrf.ts
// CSRF protection helpers.
// For mutation routes: validates that Origin matches NEXT_PUBLIC_APP_URL.
// Simple Origin-check approach — no separate token needed since we use
// SameSite=Lax cookies + Origin validation (double submit is opt-in).

import type { NextRequest } from "next/server";

/**
 * validateCsrfToken — checks Origin header matches the app's URL.
 * Returns true when the request is safe to process.
 */
export function validateCsrfToken(request: NextRequest): boolean {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  // In development without APP_URL set, skip check
  if (!appUrl) return true;

  const origin = request.headers.get("origin");
  if (!origin) {
    // Origin is absent on same-origin GET requests; only enforce on mutations
    return true;
  }

  try {
    const originUrl = new URL(origin);
    const appUrlParsed = new URL(appUrl);
    return originUrl.origin === appUrlParsed.origin;
  } catch {
    return false;
  }
}

/**
 * isMutationMethod — returns true for state-changing HTTP methods.
 */
export function isMutationMethod(method: string): boolean {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
}
