// lib/services/siteConfig.service.ts
// Dynamic platform configuration — SiteConfig key-value store.
// Read-through Redis cache (TTL 300s) for high-frequency reads.
// Admin can update values via /admin/settings/site-config without a deploy.

import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

const CACHE_TTL = 300; // seconds
const CACHE_PREFIX = "site_config:";

export const SiteConfigService = {
  isDbDisabled(): boolean {
    return process.env.DISABLE_DB === "1" || process.env.NEXT_DISABLE_DB === "1";
  },

  async get(key: string): Promise<string | null> {
    if (SiteConfigService.isDbDisabled()) return null;

    const cacheKey = `${CACHE_PREFIX}${key}`;

    // 1. Try Redis cache
    try {
      const cached = await redis.get<string>(cacheKey);
      if (cached !== null) return cached;
    } catch {
      // Redis unavailable — fall through to DB
    }

    // 2. Fetch from DB
    let record: { value: string } | null = null;
    try {
      record = await prisma.siteConfig.findUnique({ where: { key } });
    } catch {
      // DB unavailable — return null so callers can use defaults
      return null;
    }
    if (!record) return null;

    // 3. Warm cache
    try {
      await redis.set(cacheKey, record.value, { ex: CACHE_TTL });
    } catch {
      // Ignore cache write errors
    }

    return record.value;
  },

  async getOrDefault(key: string, defaultValue: string): Promise<string> {
    return (await SiteConfigService.get(key)) ?? defaultValue;
  },

  async set(key: string, value: string): Promise<void> {
    if (SiteConfigService.isDbDisabled()) return;

    try {
      await prisma.siteConfig.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    } catch {
      // DB unavailable — ignore write
      return;
    }

    // Write-through: update Redis immediately after DB write
    try {
      await redis.set(`${CACHE_PREFIX}${key}`, value, { ex: CACHE_TTL });
    } catch {
      // Ignore cache errors
    }
  },

  async invalidate(key: string): Promise<void> {
    try {
      await redis.del(`${CACHE_PREFIX}${key}`);
    } catch {
      // Ignore cache errors
    }
  },

  /**
   * Fetch multiple keys in one call.
   * Returns a record of key → value (missing keys are omitted).
   */
  async getMany(keys: string[]): Promise<Record<string, string>> {
    if (keys.length === 0) return {};
    if (SiteConfigService.isDbDisabled()) return {};

    const cacheKeys = keys.map((k) => `${CACHE_PREFIX}${k}`);
    const result: Record<string, string> = {};

    // 1. Batch Redis lookup
    let cachedValues: (string | null)[] = new Array(keys.length).fill(null);
    try {
      cachedValues = await Promise.all(cacheKeys.map((ck) => redis.get<string>(ck)));
    } catch {
      // Redis unavailable — fall through
    }

    const missedKeys: string[] = [];
    keys.forEach((key, i) => {
      if (cachedValues[i] !== null && cachedValues[i] !== undefined) {
        result[key] = cachedValues[i] as string;
      } else {
        missedKeys.push(key);
      }
    });

    if (missedKeys.length === 0) return result;

    // 2. Batch DB lookup for misses
    let dbRecords: { key: string; value: string }[] = [];
    try {
      dbRecords = await prisma.siteConfig.findMany({
        where: { key: { in: missedKeys } },
      });
    } catch {
      // DB unavailable — return whatever we have from cache
      return result;
    }

    // 3. Populate result + warm cache for misses
    await Promise.all(
      dbRecords.map(async (record) => {
        result[record.key] = record.value;
        try {
          await redis.set(`${CACHE_PREFIX}${record.key}`, record.value, { ex: CACHE_TTL });
        } catch {
          // Ignore
        }
      }),
    );

    return result;
  },

  async getAll(): Promise<Record<string, string>> {
    if (SiteConfigService.isDbDisabled()) return {};
    try {
      const records = await prisma.siteConfig.findMany();
      return Object.fromEntries(
        records.map((r: { key: string; value: string }) => [r.key, r.value]),
      );
    } catch {
      return {};
    }
  },
};
