#!/usr/bin/env tsx
// scripts/test-badges.ts
// End-to-end badge trigger smoke test. Run against a dev DB only.
// Usage: npx tsx scripts/test-badges.ts

import { prisma } from "@/lib/prisma";
import { BadgeService } from "@/lib/services/badge.service";
import { seedBadges } from "@/lib/seeds/badges.seed";

const TEST_EMAIL = "badge-test@quackcoin.dev";

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

async function ensureTestUser(): Promise<string> {
  const user = await prisma.user.upsert({
    where: { email: TEST_EMAIL },
    update: {},
    create: {
      email: TEST_EMAIL,
      name: "Badge Test User",
      passwordHash: "$2b$10$placeholder_not_real",
    },
    select: { id: true },
  });
  return user.id;
}

async function clearUserBadges(userId: string): Promise<void> {
  await prisma.userBadge.deleteMany({ where: { userId } });
}

function pass(msg: string) {
  console.log(`  ✅ ${msg}`);
}

function fail(msg: string) {
  console.error(`  ❌ ${msg}`);
  process.exitCode = 1;
}

async function hasEarned(userId: string, slug: string): Promise<boolean> {
  const badge = await prisma.badge.findUnique({ where: { slug }, select: { id: true } });
  if (!badge) return false;
  const ub = await prisma.userBadge.findFirst({ where: { userId, badgeId: badge.id } });
  return !!ub;
}

// ─────────────────────────────────────────────────────────────────
// Test suites
// ─────────────────────────────────────────────────────────────────

async function testLoginStreakBadges(userId: string) {
  console.log("\n📋 Login Streak badges");

  // Simulate 7-day streak
  await BadgeService.check({ type: "login", userId, consecutiveDays: 7 });
  if (await hasEarned(userId, "login-streak-7")) pass("Earned login-streak-7 on 7 days");
  else fail("Did not earn login-streak-7 on 7 days");

  // Should NOT earn 30-day on 7 days
  if (!await hasEarned(userId, "login-streak-30")) pass("Did not earn login-streak-30 yet");
  else fail("Should not earn login-streak-30 on only 7 days");

  // Simulate 30-day streak
  await BadgeService.check({ type: "login", userId, consecutiveDays: 30 });
  if (await hasEarned(userId, "login-streak-30")) pass("Earned login-streak-30 on 30 days");
  else fail("Did not earn login-streak-30 on 30 days");

  // Idempotency: re-triggering should not throw
  await BadgeService.check({ type: "login", userId, consecutiveDays: 30 });
  const count = await prisma.userBadge.count({
    where: { userId, badge: { slug: "login-streak-30" } },
  });
  if (count === 1) pass("login-streak-30 earned exactly once (idempotent)");
  else fail(`login-streak-30 earned ${count} times (expected 1)`);
}

async function testQcBalanceBadges(userId: string) {
  console.log("\n💰 QC Balance badges");

  await BadgeService.check({ type: "qc_balance", userId, balance: 499 });
  if (!await hasEarned(userId, "qc-hoarder-500")) pass("Did not earn qc-hoarder-500 on 499 QC");
  else fail("Should not earn qc-hoarder-500 on 499 QC");

  await BadgeService.check({ type: "qc_balance", userId, balance: 500 });
  if (await hasEarned(userId, "qc-hoarder-500")) pass("Earned qc-hoarder-500 on 500 QC");
  else fail("Did not earn qc-hoarder-500 on 500 QC");

  await BadgeService.check({ type: "qc_balance", userId, balance: 5000 });
  if (await hasEarned(userId, "qc-whale-5000")) pass("Earned qc-whale-5000 on 5000 QC");
  else fail("Did not earn qc-whale-5000 on 5000 QC");
}

async function testLearningBadges(userId: string) {
  console.log("\n📚 Learning badges");

  await BadgeService.check({ type: "lesson_complete", userId, lessonId: "lesson-1" });
  if (await hasEarned(userId, "first-lesson")) pass("Earned first-lesson on first lesson");
  else fail("Did not earn first-lesson");

  // Second lesson should not re-earn
  await BadgeService.check({ type: "lesson_complete", userId, lessonId: "lesson-2" });
  const count = await prisma.userBadge.count({
    where: { userId, badge: { slug: "first-lesson" } },
  });
  if (count === 1) pass("first-lesson earned exactly once");
  else fail(`first-lesson earned ${count} times (expected 1)`);

  await BadgeService.check({ type: "course_complete", userId, courseId: "c1", allCoursesComplete: false });
  if (await hasEarned(userId, "first-course")) pass("Earned first-course on course completion");
  else fail("Did not earn first-course");

  if (!await hasEarned(userId, "all-courses")) pass("Did not earn all-courses yet (not all complete)");
  else fail("Should not earn all-courses before all are complete");

  await BadgeService.check({ type: "course_complete", userId, courseId: "c2", allCoursesComplete: true });
  if (await hasEarned(userId, "all-courses")) pass("Earned all-courses when all complete");
  else fail("Did not earn all-courses when allCoursesComplete=true");
}

async function testTradingBadges(userId: string) {
  console.log("\n💳 Trading badges");

  await BadgeService.check({ type: "usdc_payment", userId });
  if (await hasEarned(userId, "first-usdc-payment")) pass("Earned first-usdc-payment");
  else fail("Did not earn first-usdc-payment");

  await BadgeService.check({ type: "membership_upgrade", userId, tier: "GOLD" });
  if (await hasEarned(userId, "gold-member")) pass("Earned gold-member on GOLD upgrade");
  else fail("Did not earn gold-member");

  await BadgeService.check({ type: "membership_upgrade", userId, tier: "PLATINUM" });
  if (await hasEarned(userId, "platinum-member")) pass("Earned platinum-member on PLATINUM upgrade");
  else fail("Did not earn platinum-member");
}

async function testStakingBadges(userId: string) {
  console.log("\n📈 Staking badges");

  const now = new Date();
  await BadgeService.check({
    type: "staking_deposit",
    userId,
    amount: 100,
    positionStartedAt: now,
  });
  if (await hasEarned(userId, "first-stake")) pass("Earned first-stake on first deposit");
  else fail("Did not earn first-stake");

  if (!await hasEarned(userId, "stake-1000-qc")) pass("Did not earn stake-1000-qc on 100 QC");
  else fail("Should not earn stake-1000-qc on 100 QC");

  await BadgeService.check({
    type: "staking_deposit",
    userId,
    amount: 1000,
    positionStartedAt: now,
  });
  if (await hasEarned(userId, "stake-1000-qc")) pass("Earned stake-1000-qc on 1000 QC deposit");
  else fail("Did not earn stake-1000-qc on 1000 QC deposit");

  // Staking streak
  const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
  await BadgeService.check({ type: "staking_streak", userId, daysActive: 31 });
  if (await hasEarned(userId, "staking-streak-30")) {
    pass("Earned staking-streak-30 on 31 active days");
  } else {
    fail("Did not earn staking-streak-30 on 31 active days");
  }
  // Silence unused variable warning
  void thirtyOneDaysAgo;
}

async function testSocialBadges(userId: string) {
  console.log("\n🎉 Social badges");

  await BadgeService.check({ type: "raffle_entry", userId });
  if (await hasEarned(userId, "first-raffle-entry")) pass("Earned first-raffle-entry");
  else fail("Did not earn first-raffle-entry");

  await BadgeService.check({ type: "cashback_claimed", userId });
  if (await hasEarned(userId, "first-cashback")) pass("Earned first-cashback");
  else fail("Did not earn first-cashback");
}

// ─────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────

async function main() {
  console.log("🦆 QuackCoin Badge Smoke Test");
  console.log("================================\n");

  // Ensure badges are seeded
  console.log("⏳ Seeding badges...");
  await seedBadges();

  // Setup test user
  const userId = await ensureTestUser();
  console.log(`✅ Test user: ${TEST_EMAIL} (${userId})`);

  // Clear any pre-existing badges for a clean run
  await clearUserBadges(userId);
  console.log("✅ Cleared existing test user badges");

  // Run all suites
  await testLoginStreakBadges(userId);
  await testQcBalanceBadges(userId);
  await testLearningBadges(userId);
  await testTradingBadges(userId);
  await testStakingBadges(userId);
  await testSocialBadges(userId);

  // Summary
  const earned = await prisma.userBadge.count({ where: { userId } });
  const total = await prisma.badge.count({ where: { isActive: true } });

  console.log("\n================================");
  console.log(`📊 Summary: ${earned}/${total} badges earned by test user`);

  if (process.exitCode === 1) {
    console.log("❌ Some tests failed — see above");
  } else {
    console.log("✅ All badge trigger tests passed!");
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
