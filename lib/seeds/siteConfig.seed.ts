// lib/seeds/siteConfig.seed.ts
// Seed default SiteConfig values.
// Idempotent — safe to re-run (uses upsert).
// Run with: npx ts-node --esm lib/seeds/siteConfig.seed.ts

import { prisma } from "@/lib/prisma";

const defaults: { key: string; value: string; description: string }[] = [
  // QC earn rates
  { key: "qc.earn.login", value: "10", description: "QC earned on daily login" },
  { key: "qc.earn.lesson_complete", value: "5", description: "QC earned per lesson completed" },
  { key: "qc.earn.course_complete", value: "50", description: "QC earned per course completed" },
  { key: "qc.earn.referral", value: "25", description: "QC earned per successful referral" },
  { key: "qc.earn.profile_complete", value: "20", description: "QC earned on profile completion" },
  { key: "qc.earn.daily_streak", value: "5", description: "Bonus QC per day of streak" },

  // Staking
  { key: "staking.apy", value: "0.08", description: "Annual percentage yield for QC staking (e.g. 0.08 = 8%)" },
  { key: "staking.min_amount", value: "100", description: "Minimum QC to open a staking position" },
  { key: "staking.unstake_delay_days", value: "7", description: "Days to wait before unstaking completes" },

  // Cashback
  { key: "cashback.rate", value: "0.05", description: "Cashback rate on referral purchases (e.g. 0.05 = 5%)" },
  { key: "cashback.window_days", value: "30", description: "Days after click that purchases qualify for cashback" },

  // Membership prices (in USDC)
  { key: "membership.price.silver", value: "9.99", description: "Monthly price for Silver tier (USDC)" },
  { key: "membership.price.gold", value: "19.99", description: "Monthly price for Gold tier (USDC)" },
  { key: "membership.price.platinum", value: "49.99", description: "Monthly price for Platinum tier (USDC)" },

  // Membership tier benefits
  { key: "membership.silver.qc_multiplier", value: "1.5", description: "QC earn multiplier for Silver members" },
  { key: "membership.gold.qc_multiplier", value: "2.0", description: "QC earn multiplier for Gold members" },
  { key: "membership.platinum.qc_multiplier", value: "3.0", description: "QC earn multiplier for Platinum members" },
  { key: "membership.silver.staking_bonus", value: "0", description: "Staking APY bonus (pp) for Silver members" },
  { key: "membership.gold.staking_bonus", value: "5", description: "Staking APY bonus (pp) for Gold members" },
  { key: "membership.platinum.staking_bonus", value: "15", description: "Staking APY bonus (pp) for Platinum members" },
  { key: "membership.silver.cashback_bonus", value: "0", description: "Cashback % bonus for Silver members" },
  { key: "membership.gold.cashback_bonus", value: "1", description: "Cashback % bonus for Gold members" },
  { key: "membership.platinum.cashback_bonus", value: "2", description: "Cashback % bonus for Platinum members" },

  // Feature flags
  { key: "feature.raffles", value: "true", description: "Enable raffle system" },
  { key: "feature.staking", value: "true", description: "Enable QC staking" },
  { key: "feature.affiliate", value: "true", description: "Enable affiliate system" },
];

async function seed() {
  console.log("🌱 Seeding SiteConfig defaults...");

  let created = 0;
  let updated = 0;

  for (const { key, value } of defaults) {
    const existing = await prisma.siteConfig.findUnique({ where: { key } });
    if (existing) {
      // Keep existing value — only update if explicitly overriding
      updated++;
    } else {
      await prisma.siteConfig.create({ data: { key, value } });
      created++;
    }
  }

  console.log(`✅ SiteConfig seed complete: ${created} created, ${updated} already existed`);
}

seed()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
