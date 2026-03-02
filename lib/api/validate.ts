// lib/api/validate.ts
// Zod-based request body validation with typed field-level errors.

import type { ZodSchema } from "zod";

export interface FieldError {
  field: string;
  message: string;
}

export class ValidationError extends Error {
  readonly fields: FieldError[];
  readonly statusCode = 400;

  constructor(fields: FieldError[]) {
    super("Validation failed");
    this.name = "ValidationError";
    this.fields = fields;
  }
}

/**
 * Validate an unknown body against a Zod schema.
 * Throws `ValidationError` with field-level messages on failure.
 *
 * @example
 * const body = validateBody(mySchema, await request.json())
 */
export function validateBody<T>(schema: ZodSchema<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (result.success) return result.data;

  const fields: FieldError[] = result.error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));

  throw new ValidationError(fields);
}

/**
 * Validate query/search params as a plain object.
 */
export function validateQuery<T>(schema: ZodSchema<T>, searchParams: URLSearchParams): T {
  const obj = Object.fromEntries(searchParams.entries());
  const result = schema.safeParse(obj);
  if (result.success) return result.data;

  const fields: FieldError[] = result.error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));

  throw new ValidationError(fields);
}

/**
 * Format a ValidationError or any Error into a Next.js-compatible JSON response body.
 */
export function errorResponse(err: unknown): Response {
  if (err instanceof ValidationError) {
    return Response.json(
      { ok: false, error: "Validation failed", fields: err.fields },
      { status: 400 },
    );
  }
  if (err instanceof Error) {
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
  return Response.json({ ok: false, error: "Unknown error" }, { status: 500 });
}
