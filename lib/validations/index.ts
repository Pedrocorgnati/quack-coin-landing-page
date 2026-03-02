// lib/validations/index.ts
// Base Zod schemas shared across the platform.

import { z } from "zod";

// ── Primitives ────────────────────────────────────────────────
export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Invalid email address")
  .max(255, "Email must be 255 characters or less");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be 128 characters or less")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export const uuidSchema = z.string().cuid("Invalid ID format");

export const slugSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers and hyphens");

// ── Pagination ────────────────────────────────────────────────
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

// ── Date Range ────────────────────────────────────────────────
export const dateRangeSchema = z
  .object({
    from: z.coerce.date(),
    to: z.coerce.date(),
  })
  .refine((d) => d.from <= d.to, "Date 'from' must be before 'to'");

export type DateRangeInput = z.infer<typeof dateRangeSchema>;

// ── User ──────────────────────────────────────────────────────
export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  username: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-zA-Z0-9_]+$/, "Username may only contain letters, numbers and underscores")
    .optional(),
  bio: z.string().max(500).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// ── Solana wallet address ─────────────────────────────────────
export const solanaAddressSchema = z
  .string()
  .length(44, "Invalid Solana wallet address")
  .regex(/^[1-9A-HJ-NP-Za-km-z]+$/, "Invalid base58 address");
