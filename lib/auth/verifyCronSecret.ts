// lib/auth/verifyCronSecret.ts
// Validates the cron job Authorization header against CRON_SECRET.

import { timingSafeEqual } from "crypto";
import { env } from "@/lib/env";

/**
 * Returns true if the Authorization header matches "Bearer {CRON_SECRET}".
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function verifyCronSecret(authHeader: string | null): boolean {
  if (!authHeader) return false;
  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) return false;

  try {
    const expected = Buffer.from(env.CRON_SECRET, "utf8");
    const actual = Buffer.from(token, "utf8");
    if (expected.length !== actual.length) return false;
    return timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}
