// lib/api/withZod.ts
// HOC that validates request body against a Zod schema.
// Returns 422 with structured field errors on failure.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { ZodSchema, z } from "zod";

type ValidatedHandler<T> = (
  request: NextRequest,
  body: T,
  ctx?: unknown,
) => Promise<NextResponse> | NextResponse;

/**
 * withZod — parse and validate JSON body with a Zod schema.
 * On success, passes the typed body to the handler.
 * On failure, returns 422 with { error, fieldErrors }.
 */
export function withZod<S extends ZodSchema>(schema: S, handler: ValidatedHandler<z.infer<S>>) {
  return async (request: NextRequest, ctx?: unknown) => {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }

    const result = schema.safeParse(raw);
    if (!result.success) {
      return NextResponse.json(
        {
          error: "Validation failed.",
          fieldErrors: result.error.flatten().fieldErrors,
        },
        { status: 422 },
      );
    }

    return handler(request, result.data, ctx);
  };
}
