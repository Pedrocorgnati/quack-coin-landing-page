// lib/rate-limit.ts — Rate limiting utility
// Uses Upstash Redis slidingWindow algorithm.
// All API routes import withRateLimit() from this singleton.
// Created in module-01 — used across all API routes in subsequent modules.

import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "@/lib/redis";

// Shared rate limiter instances (keyed by limit+window)
const limiters = new Map<string, Ratelimit>();

function getRatelimiter(limit: number, window: string): Ratelimit {
  const key = `${limit}:${window}`;
  if (!limiters.has(key)) {
    limiters.set(
      key,
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(limit, window as Parameters<typeof Ratelimit.slidingWindow>[1]),
        prefix: "qc_rl",
        analytics: false,
      }),
    );
  }
  return limiters.get(key)!;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  limit: number;
  reset: number; // Unix timestamp ms when the window resets
}

/**
 * withRateLimit — check rate limit for a given identifier.
 *
 * @param identifier - unique key (e.g. IP address, userId, `login:${ip}`)
 * @param limit      - max requests allowed in the window (default: 10)
 * @param window     - time window string (default: "60 s")
 */
export async function withRateLimit(
  identifier: string,
  limit = 10,
  window = "60 s",
): Promise<RateLimitResult> {
  const ratelimiter = getRatelimiter(limit, window);
  const result = await ratelimiter.limit(identifier);
  return {
    success: result.success,
    remaining: result.remaining,
    limit: result.limit,
    reset: result.reset,
  };
}

// Common presets for convenience
export const rateLimitPresets = {
  /** Strict: 5 requests / 60s — login, register, password reset */
  strict: (id: string) => withRateLimit(id, 5, "60 s"),
  /** Standard: 30 requests / 60s — general API routes */
  standard: (id: string) => withRateLimit(id, 30, "60 s"),
  /** Relaxed: 60 requests / 60s — read-only endpoints */
  relaxed: (id: string) => withRateLimit(id, 60, "60 s"),
};
