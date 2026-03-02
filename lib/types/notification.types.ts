// lib/types/notification.types.ts
// Typed notification payload shapes — one per NotificationType enum value.

import type { NotificationType } from "@/lib/generated/prisma/client";

// ── Per-type payload shapes ───────────────────────────────────

interface NewMessagePayload {
  conversationId: string;
  senderName: string;
  preview: string;
}

interface BadgeEarnedPayload {
  badgeId: string;
  badgeName: string;
  badgeImageUrl: string;
}

interface RaffleWonPayload {
  raffleId: string;
  raffleTitle: string;
  prizeDetail: string;
}

interface QcEarnedPayload {
  amount: number;
  reason: string;
  newBalance: number;
}

interface CourseCompletedPayload {
  courseId: string;
  courseTitle: string;
  qcEarned: number;
  certificateUrl?: string;
}

interface LessonCompletedPayload {
  lessonId: string;
  lessonTitle: string;
  qcEarned: number;
}

interface ReferralRewardPayload {
  referredUserName: string;
  qcEarned: number;
}

interface MembershipExpiringPayload {
  tier: string;
  expiresAt: string; // ISO date string
  daysRemaining: number;
}

interface SystemPayload {
  message: string;
  actionUrl?: string;
  actionLabel?: string;
}

interface PromoPayload {
  title: string;
  body: string;
  imageUrl?: string;
  ctaUrl?: string;
  ctaLabel?: string;
}

// ── Union discriminated by type ───────────────────────────────

export type NotificationPayload =
  | { type: typeof NotificationType.NEW_MESSAGE; data: NewMessagePayload }
  | { type: typeof NotificationType.BADGE_EARNED; data: BadgeEarnedPayload }
  | { type: typeof NotificationType.RAFFLE_WON; data: RaffleWonPayload }
  | { type: typeof NotificationType.QC_EARNED; data: QcEarnedPayload }
  | { type: typeof NotificationType.COURSE_COMPLETED; data: CourseCompletedPayload }
  | { type: typeof NotificationType.LESSON_COMPLETED; data: LessonCompletedPayload }
  | { type: typeof NotificationType.REFERRAL_REWARD; data: ReferralRewardPayload }
  | { type: typeof NotificationType.MEMBERSHIP_EXPIRING; data: MembershipExpiringPayload }
  | { type: typeof NotificationType.SYSTEM; data: SystemPayload }
  | { type: typeof NotificationType.PROMO; data: PromoPayload };

export type NotificationPayloadFor<T extends NotificationType> = Extract<
  NotificationPayload,
  { type: T }
>["data"];
