// lib/services/notification.service.ts
// NotificationService — in-app notification dispatch.
// Persists to DB, delivers via unified SSE stream (SseManager).
// Web Push delivery added in module-15 TASK-3.

import webpush from "web-push";
import { prisma } from "@/lib/prisma";
import type { Notification } from "@/lib/generated/prisma/client";
import type { NotificationType } from "@/lib/generated/prisma/client";
import type { NotificationPayload } from "@/lib/types/notification.types";
import { SseManager } from "@/lib/sse/sseManager";
import { getPreferences } from "@/lib/notifications/preferences";

// Configure VAPID once at module load (no-op if keys not set — dev fallback)
if (
  process.env.VAPID_PRIVATE_KEY &&
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
  process.env.VAPID_SUBJECT
) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
}

export const NotificationService = {
  /**
   * Send a notification to a single user.
   * Inserts a Notification row and logs to console (SSE dispatch added in module-15).
   */
  async send(
    userId: string,
    type: NotificationType,
    payload: NotificationPayload,
  ): Promise<Notification> {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title: NotificationService._buildTitle(payload),
        body: NotificationService._buildBody(payload),
        data: payload.data as object,
        isRead: false,
      },
    });

    // Load user preferences (Redis-cached, 120s TTL)
    const prefs = await getPreferences(userId);
    const typePref = prefs[type] ?? { inApp: true, push: true };

    const ssePayload = {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      isRead: false,
      createdAt: notification.createdAt.toISOString(),
    };

    // Emit SSE event only if in-app channel is enabled
    if (typePref.inApp) {
      SseManager.emit(userId, "notification", ssePayload);
    }

    // If user is offline (no SSE) and push is enabled, attempt Web Push
    if (typePref.push && !SseManager.isConnected(userId)) {
      void NotificationService._sendWebPush(userId, {
        title: notification.title,
        body: notification.body,
      });
    }

    return notification;
  },

  /**
   * Send the same notification to multiple users.
   */
  async sendBulk(
    userIds: string[],
    type: NotificationType,
    payload: NotificationPayload,
  ): Promise<void> {
    await Promise.all(userIds.map((uid) => NotificationService.send(uid, type, payload)));
  },

  /**
   * Mark a notification as read.
   */
  async markRead(notificationId: string): Promise<void> {
    await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });
  },

  /**
   * Get all unread notifications for a user (newest first).
   */
  async getUnread(userId: string): Promise<Notification[]> {
    return prisma.notification.findMany({
      where: { userId, isRead: false },
      orderBy: { createdAt: "desc" },
    });
  },

  /**
   * Get unread count for a user.
   */
  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({ where: { userId, isRead: false } });
  },

  // ── Web Push delivery (offline users) ─────────────────────────
  async _sendWebPush(userId: string, data: { title: string; body: string; href?: string }): Promise<void> {
    const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
    if (subscriptions.length === 0) return;

    const payload = JSON.stringify(data);
    const gone: string[] = [];

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
          );
        } catch (err: unknown) {
          // 410 Gone = subscription expired; mark for removal
          if ((err as { statusCode?: number }).statusCode === 410) {
            gone.push(sub.id);
          }
        }
      }),
    );

    if (gone.length > 0) {
      await prisma.pushSubscription.deleteMany({ where: { id: { in: gone } } });
    }
  },

  // ── Private helpers ───────────────────────────────────────────
  _buildTitle(payload: NotificationPayload): string {
    switch (payload.type) {
      case "NEW_MESSAGE": return "New message";
      case "BADGE_EARNED": return `Badge unlocked: ${payload.data.badgeName}`;
      case "RAFFLE_WON": return `You won: ${payload.data.raffleTitle}`;
      case "QC_EARNED": return `+${payload.data.amount} QC earned`;
      case "COURSE_COMPLETED": return "Course completed!";
      case "LESSON_COMPLETED": return "Lesson completed!";
      case "REFERRAL_REWARD": return "Referral reward";
      case "MEMBERSHIP_EXPIRING": return "Membership expiring soon";
      case "SYSTEM": return "System notification";
      case "PROMO": return payload.data.title;
      default: return "Notification";
    }
  },

  _buildBody(payload: NotificationPayload): string {
    switch (payload.type) {
      case "NEW_MESSAGE": return payload.data.preview;
      case "BADGE_EARNED": return `You unlocked the ${payload.data.badgeName} badge!`;
      case "RAFFLE_WON": return payload.data.prizeDetail;
      case "QC_EARNED": return `${payload.data.reason}. New balance: ${payload.data.newBalance} QC`;
      case "COURSE_COMPLETED": return `You earned ${payload.data.qcEarned} QC for completing the course.`;
      case "LESSON_COMPLETED": return `+${payload.data.qcEarned} QC for completing: ${payload.data.lessonTitle}`;
      case "REFERRAL_REWARD": return `${payload.data.referredUserName} joined. You earned ${payload.data.qcEarned} QC.`;
      case "MEMBERSHIP_EXPIRING": return `Your ${payload.data.tier} membership expires in ${payload.data.daysRemaining} day(s).`;
      case "SYSTEM": return payload.data.message;
      case "PROMO": return payload.data.body;
      default: return "";
    }
  },
};
