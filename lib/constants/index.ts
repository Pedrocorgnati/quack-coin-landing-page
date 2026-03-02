// lib/constants/index.ts
// Compile-time defaults for platform configuration.
// Runtime values are read from SiteConfigService (overridable via /admin/settings).

import type { MembershipTier } from "@/lib/generated/prisma/client";

// ── QC Earn Rates ─────────────────────────────────────────────
export const QC_EARN_DEFAULTS = {
  login: 10,
  lesson_complete: 5,
  course_complete: 50,
  referral: 25,
  profile_complete: 20,
  daily_streak: 5,
} as const;

// SiteConfig keys for QC earn rates
export const QC_CONFIG_KEYS = {
  login: "qc.earn.login",
  lesson_complete: "qc.earn.lesson_complete",
  course_complete: "qc.earn.course_complete",
  referral: "qc.earn.referral",
  profile_complete: "qc.earn.profile_complete",
  daily_streak: "qc.earn.daily_streak",
  // Expiry
  expiry_enabled: "qc.expiry.enabled",
  expiry_days: "qc.expiry.days",
} as const;

// QC expiry defaults
export const QC_EXPIRY_DEFAULTS = {
  enabled: false,
  days: 365, // 1 year
} as const;

// ── Membership Tier Thresholds (QC balance required) ──────────
export const MEMBERSHIP_THRESHOLDS: Record<MembershipTier, number> = {
  FREE: 0,
  SILVER: 500,
  GOLD: 2000,
  PLATINUM: 10000,
};

// SiteConfig key
export const STAKING_APY_KEY = "staking.apy";
export const STAKING_APY_DEFAULT = 0.08; // 8%

// ── Cashback ──────────────────────────────────────────────────
export const CASHBACK_RATE_KEY = "cashback.rate";
export const CASHBACK_RATE_DEFAULT = 0.05; // 5%

export const CASHBACK_WINDOW_DAYS_KEY = "cashback.window_days";
export const CASHBACK_WINDOW_DAYS_DEFAULT = 30;

// ── Rate Limiting Windows ─────────────────────────────────────
export const RATE_LIMIT = {
  auth: { requests: 10, windowMs: 60_000 },       // 10 req/min for login/register
  otp: { requests: 5, windowMs: 60_000 },          // 5 req/min for OTP
  api: { requests: 100, windowMs: 60_000 },        // 100 req/min general API
  admin: { requests: 200, windowMs: 60_000 },      // 200 req/min admin
} as const;

// ── Badge Unlock Thresholds ───────────────────────────────────
export const BADGE_QC_THRESHOLDS = {
  first_earn: 1,
  bronze_holder: 100,
  silver_holder: 500,
  gold_holder: 2000,
  platinum_holder: 10000,
  staker: 1,
  course_graduate: 1,
} as const;

// ── Session TTL ───────────────────────────────────────────────
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ── OTP TTL ───────────────────────────────────────────────────
export const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

// ── Password Reset TTL ────────────────────────────────────────
export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

// ── Pagination defaults ───────────────────────────────────────
export const PAGINATION_DEFAULTS = {
  page: 1,
  limit: 20,
  maxLimit: 100,
} as const;

// ── Membership expiry warning threshold ───────────────────────
export const MEMBERSHIP_EXPIRY_WARNING_DAYS = 7;

// ── Solana Pay ────────────────────────────────────────────────
export const SOLANA_PAY_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes
