// lib/redis.ts — Upstash Redis singleton
// Uses REST API (no persistent TCP connection) — safe for Next.js serverless.

import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
