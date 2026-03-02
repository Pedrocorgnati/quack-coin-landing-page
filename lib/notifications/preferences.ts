// lib/notifications/preferences.ts
// NotificationPreference helpers: shape, defaults, DB read, cache (Redis TTL 120s).

import { NotificationType } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

export interface TypePreference {
  inApp: boolean;
  push: boolean;
}

export type NotificationPreferences = Partial<Record<NotificationType, TypePreference>>;

// ── Defaults (all channels enabled for every type) ───────────
export function defaultPreferences(): NotificationPreferences {
  const result: NotificationPreferences = {};
  for (const type of Object.values(NotificationType)) {
    result[type] = { inApp: true, push: true };
  }
  return result;
}

function cacheKey(userId: string): string {
  return `notif_prefs:${userId}`;
}

/** Load preferences for a user, merging with defaults. Cached in Redis for 120s. */
export async function getPreferences(userId: string): Promise<NotificationPreferences> {
  const cached = await redis.get<NotificationPreferences>(cacheKey(userId)).catch(() => null);
  if (cached) return mergeWithDefaults(cached);

  const record = await prisma.notificationPreference.findUnique({ where: { userId } });
  const stored = (record?.typePreferences as NotificationPreferences | null) ?? {};
  const merged = mergeWithDefaults(stored);

  await redis.set(cacheKey(userId), merged, { ex: 120 }).catch(() => {});
  return merged;
}

/** Persist preferences to DB and invalidate the cache. */
export async function savePreferences(
  userId: string,
  prefs: NotificationPreferences,
): Promise<NotificationPreferences> {
  const merged = mergeWithDefaults(prefs);

  await prisma.notificationPreference.upsert({
    where: { userId },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    update: { typePreferences: merged as any },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    create: { userId, typePreferences: merged as any },
  });

  // Invalidate cache
  await redis.del(cacheKey(userId)).catch(() => {});

  return merged;
}

function mergeWithDefaults(stored: NotificationPreferences): NotificationPreferences {
  const defaults = defaultPreferences();
  for (const type of Object.values(NotificationType)) {
    const stored_ = stored[type];
    if (stored_ !== undefined) {
      defaults[type] = { inApp: stored_.inApp ?? true, push: stored_.push ?? true };
    }
  }
  return defaults;
}
