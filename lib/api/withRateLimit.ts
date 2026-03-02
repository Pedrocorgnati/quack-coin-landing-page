// lib/api/withRateLimit.ts
// HOC that wraps a Route Handler with rate limiting.
// Returns 429 with Retry-After header when limit is exceeded.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { headers } from "next/headers";
import { withRateLimit } from "@/lib/rate-limit";

type Handler = (request: NextRequest, ctx?: unknown) => Promise<NextResponse> | NextResponse;

/**
 * withRateLimitedRoute — apply rate limiting to a route handler.
 *
 * @param handler   - the route handler to wrap
 * @param limit     - max requests (default 30)
 * @param window    - time window string (default "60 s")
 * @param keyPrefix - prefix to distinguish rate limit buckets
 */
export function withRateLimitedRoute(
  handler: Handler,
  limit = 30,
  window = "60 s",
  keyPrefix = "route",
) {
  return async (request: NextRequest, ctx?: unknown) => {
    const hdrs = await headers();
    const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const identifier = `${keyPrefix}:${ip}`;

    const result = await withRateLimit(identifier, limit, window);

    if (!result.success) {
      const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter > 0 ? retryAfter : 60),
            "X-RateLimit-Limit": String(result.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(result.reset),
          },
        },
      );
    }

    return handler(request, ctx);
  };
}
