// lib/types/index.ts
// Shared TypeScript enums and types used by 2+ modules.
// Re-exports Prisma enums for convenience — no duplicate definitions.

export {
  Role,
  MembershipTier,
  TransactionType,
  StakingEventType,
  StakingStatus,
  PaymentStatus,
  CourseStatus,
  LessonType,
  NotificationType,
  BadgeCategory,
  RaffleStatus,
  MessageStatus,
  ConversationStatus,
} from "@/lib/generated/prisma/client";

// ── Pagination ────────────────────────────────────────────────
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

// ── API Response ──────────────────────────────────────────────
export interface ApiSuccess<T = unknown> {
  ok: true;
  data: T;
  message?: string;
}

export interface ApiError {
  ok: false;
  error: string;
  fields?: { field: string; message: string }[];
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

// ── Auth ──────────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: import("@/lib/generated/prisma/client").Role;
  membershipTier: import("@/lib/generated/prisma/client").MembershipTier;
  membershipExpiresAt: Date | null;
  twoFactorEnabled: boolean;
  avatarUrl: string | null;
}

// ── Serializable user for client session ─────────────────────
export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  membershipTier: string;
  avatarUrl: string | null;
}
