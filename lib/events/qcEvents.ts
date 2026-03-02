// lib/events/qcEvents.ts
// QcEarnEvent — discriminated union of all QC-earning actions.

export type QcEarnEvent =
  | { type: "daily_login"; userId: string }
  | { type: "first_login"; userId: string }           // QA-015: one-time +5 QC on first login
  | { type: "lesson_complete"; userId: string; lessonId: string }
  | { type: "course_complete"; userId: string; courseId: string }
  | { type: "stake_deposit"; userId: string; amount: number }
  | { type: "raffle_enter"; userId: string; ticketCount: number }
  | { type: "badge_unlock"; userId: string; badgeId: string }
  | { type: "profile_complete"; userId: string }
  | { type: "referral"; userId: string; referredUserId: string }
  | { type: "streak_7day"; userId: string }           // QA-016: +10 QC at 7-day login streak
  | { type: "streak_30day"; userId: string };          // QA-016: +50 QC at 30-day login streak
