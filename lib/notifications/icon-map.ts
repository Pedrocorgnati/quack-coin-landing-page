// lib/notifications/icon-map.ts
// Maps each NotificationType to a Lucide icon component + Tailwind color class.

import {
  MessageSquare,
  Award,
  Trophy,
  Coins,
  BookOpen,
  BookCheck,
  Users,
  AlertTriangle,
  Bell,
  Megaphone,
  type LucideIcon,
} from "lucide-react";
import { NotificationType } from "@/lib/generated/prisma/client";

export interface NotificationIconConfig {
  Icon: LucideIcon;
  colorClass: string;    // Tailwind text-* color class
  bgClass: string;       // Tailwind bg-*/10 or similar
}

export const NOTIFICATION_ICON_MAP: Record<NotificationType, NotificationIconConfig> = {
  [NotificationType.NEW_MESSAGE]: {
    Icon: MessageSquare,
    colorClass: "text-indigo-600 dark:text-indigo-400",
    bgClass: "bg-indigo-100 dark:bg-indigo-900/30",
  },
  [NotificationType.BADGE_EARNED]: {
    Icon: Award,
    colorClass: "text-purple-600 dark:text-purple-400",
    bgClass: "bg-purple-100 dark:bg-purple-900/30",
  },
  [NotificationType.RAFFLE_WON]: {
    Icon: Trophy,
    colorClass: "text-yellow-600 dark:text-yellow-400",
    bgClass: "bg-yellow-100 dark:bg-yellow-900/30",
  },
  [NotificationType.QC_EARNED]: {
    Icon: Coins,
    colorClass: "text-green-600 dark:text-green-400",
    bgClass: "bg-green-100 dark:bg-green-900/30",
  },
  [NotificationType.COURSE_COMPLETED]: {
    Icon: BookOpen,
    colorClass: "text-sky-600 dark:text-sky-400",
    bgClass: "bg-sky-100 dark:bg-sky-900/30",
  },
  [NotificationType.LESSON_COMPLETED]: {
    Icon: BookCheck,
    colorClass: "text-teal-600 dark:text-teal-400",
    bgClass: "bg-teal-100 dark:bg-teal-900/30",
  },
  [NotificationType.REFERRAL_REWARD]: {
    Icon: Users,
    colorClass: "text-blue-600 dark:text-blue-400",
    bgClass: "bg-blue-100 dark:bg-blue-900/30",
  },
  [NotificationType.MEMBERSHIP_EXPIRING]: {
    Icon: AlertTriangle,
    colorClass: "text-orange-600 dark:text-orange-400",
    bgClass: "bg-orange-100 dark:bg-orange-900/30",
  },
  [NotificationType.SYSTEM]: {
    Icon: Bell,
    colorClass: "text-muted-foreground",
    bgClass: "bg-muted",
  },
  [NotificationType.PROMO]: {
    Icon: Megaphone,
    colorClass: "text-pink-600 dark:text-pink-400",
    bgClass: "bg-pink-100 dark:bg-pink-900/30",
  },
};
