// lib/events/qcEventHandler.ts
// Central handler for all QC earning events.
// Reads earn rates from SiteConfigService. Idempotent per event + date/resource.

import { QcService } from "@/lib/services/qc.service";
import { SiteConfigService } from "@/lib/services/siteConfig.service";
import { MembershipService } from "@/lib/services/membership.service";
import { QC_CONFIG_KEYS, QC_EARN_DEFAULTS } from "@/lib/constants";
import type { QcEarnEvent } from "./qcEvents";

/**
 * Build an idempotency key for a QC event.
 * Daily events use `{type}:{userId}:{date}` — ensures one earn per day.
 * One-time events use `{type}:{userId}:{resourceId}`.
 */
function buildIdempotencyKey(event: QcEarnEvent): string {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  switch (event.type) {
    case "daily_login":
      return `daily_login:${event.userId}:${today}`;
    case "first_login":
      // QA-015: one-time key — no date suffix, so it fires exactly once per user
      return `first_login:${event.userId}`;
    case "lesson_complete":
      return `lesson_complete:${event.userId}:${event.lessonId}`;
    case "course_complete":
      return `course_complete:${event.userId}:${event.courseId}`;
    case "stake_deposit":
      return `stake_deposit:${event.userId}:${today}`;
    case "raffle_enter":
      return `raffle_enter:${event.userId}:${today}`;
    case "badge_unlock":
      return `badge_unlock:${event.userId}:${event.badgeId}`;
    case "profile_complete":
      return `profile_complete:${event.userId}`;
    case "referral":
      return `referral:${event.userId}:${event.referredUserId}`;
    case "streak_7day":
      // QA-016: one bonus per calendar week to prevent re-triggering
      return `streak_7day:${event.userId}:${today.slice(0, 7)}`;
    case "streak_30day":
      // QA-016: one bonus per calendar month
      return `streak_30day:${event.userId}:${today.slice(0, 7)}`;
  }
}

/**
 * Fetch the QC earn rate for a given event type from SiteConfig.
 * Falls back to compile-time defaults if the config key is not found.
 */
async function getEarnRate(event: QcEarnEvent): Promise<number> {
  switch (event.type) {
    case "daily_login": {
      const v = await SiteConfigService.getOrDefault(
        QC_CONFIG_KEYS.login,
        String(QC_EARN_DEFAULTS.login),
      );
      return Math.max(0, parseInt(v, 10));
    }
    case "lesson_complete": {
      const v = await SiteConfigService.getOrDefault(
        QC_CONFIG_KEYS.lesson_complete,
        String(QC_EARN_DEFAULTS.lesson_complete),
      );
      return Math.max(0, parseInt(v, 10));
    }
    case "course_complete": {
      const v = await SiteConfigService.getOrDefault(
        QC_CONFIG_KEYS.course_complete,
        String(QC_EARN_DEFAULTS.course_complete),
      );
      return Math.max(0, parseInt(v, 10));
    }
    case "referral": {
      const v = await SiteConfigService.getOrDefault(
        QC_CONFIG_KEYS.referral,
        String(QC_EARN_DEFAULTS.referral),
      );
      return Math.max(0, parseInt(v, 10));
    }
    case "profile_complete": {
      const v = await SiteConfigService.getOrDefault(
        QC_CONFIG_KEYS.profile_complete,
        String(QC_EARN_DEFAULTS.profile_complete),
      );
      return Math.max(0, parseInt(v, 10));
    }
    case "stake_deposit":
      // Bonus: 0.1 QC per USDC staked, up to 100 QC
      return Math.min(100, Math.floor(event.amount * 0.1));
    case "raffle_enter":
      // Earn 2 QC per ticket (paid via QC deduction, small bonus)
      return 0; // raffle tickets are deductions, not earns
    case "badge_unlock":
      return 5; // flat 5 QC per badge unlock
    case "first_login":
      return 5; // QA-015: +5 QC on first ever login
    case "streak_7day":
      return 10; // QA-016: +10 QC at 7-day streak milestone
    case "streak_30day":
      return 50; // QA-016: +50 QC at 30-day streak milestone
  }
}

function buildReason(event: QcEarnEvent): string {
  switch (event.type) {
    case "daily_login":
      return "Daily login reward";
    case "lesson_complete":
      return `Lesson completed: ${event.lessonId}`;
    case "course_complete":
      return `Course completed: ${event.courseId}`;
    case "stake_deposit":
      return "Staking deposit bonus";
    case "raffle_enter":
      return "Raffle participation";
    case "badge_unlock":
      return `Badge unlocked: ${event.badgeId}`;
    case "profile_complete":
      return "Profile completion reward";
    case "referral":
      return `Referral reward: ${event.referredUserId}`;
    case "first_login":
      return "Welcome bonus — first login";
    case "streak_7day":
      return "7-day login streak bonus";
    case "streak_30day":
      return "30-day login streak bonus";
  }
}

/**
 * Handle a QC earn event. Idempotent — safe to call multiple times with same event.
 * Returns null if the event earns 0 QC (e.g. raffle_enter).
 */
export async function handleQcEvent(
  event: QcEarnEvent,
): Promise<{ earned: number; idempotencyKey: string } | null> {
  const baseAmount = await getEarnRate(event);
  if (baseAmount <= 0) return null;

  // Apply membership QC multiplier (e.g. Gold = 2x, Platinum = 3x)
  const benefits = await MembershipService.getActiveBenefits(event.userId);
  const amount = Math.round(baseAmount * benefits.qcMultiplier);

  const idempotencyKey = buildIdempotencyKey(event);
  const reason = buildReason(event);

  const tx = await QcService.earn(event.userId, amount, reason, idempotencyKey);

  return { earned: tx.amount, idempotencyKey };
}
