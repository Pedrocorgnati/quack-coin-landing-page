// lib/seeds/badges.seed.ts
// Seed 18 badges across 6 categories.
// Run via: npx ts-node --compiler-options '{"module":"CommonJS"}' lib/seeds/badges.seed.ts
// or call seedBadges() from main seed script.

import { PrismaClient, BadgeCategory } from "@/lib/generated/prisma/client";

const prisma = new PrismaClient();

export interface BadgeSeedData {
  slug: string;
  name: string;
  description: string;
  imageUrl: string;
  category: BadgeCategory;
  qcThreshold?: number;
}

export const BADGE_CATALOG: BadgeSeedData[] = [
  // ── LOYALTY (5 badges) — login streaks + engagement ─────────
  {
    slug: "login-streak-7",
    name: "7-Day Streak",
    description: "Log in for 7 consecutive days.",
    imageUrl: "/badges/placeholder.png",
    category: BadgeCategory.LOYALTY,
  },
  {
    slug: "login-streak-30",
    name: "30-Day Streak",
    description: "Log in for 30 consecutive days.",
    imageUrl: "/badges/placeholder.png",
    category: BadgeCategory.LOYALTY,
  },
  {
    slug: "login-streak-90",
    name: "90-Day Streak",
    description: "Log in for 90 consecutive days.",
    imageUrl: "/badges/placeholder.png",
    category: BadgeCategory.LOYALTY,
  },
  {
    slug: "qc-hoarder-500",
    name: "QC Hoarder",
    description: "Accumulate 500 QC in your wallet.",
    imageUrl: "/badges/placeholder.png",
    category: BadgeCategory.LOYALTY,
    qcThreshold: 500,
  },
  {
    slug: "qc-whale-5000",
    name: "QC Whale",
    description: "Accumulate 5,000 QC in your wallet.",
    imageUrl: "/badges/placeholder.png",
    category: BadgeCategory.LOYALTY,
    qcThreshold: 5000,
  },

  // ── LEARNING (3 badges) ──────────────────────────────────────
  {
    slug: "first-lesson",
    name: "First Step",
    description: "Complete your first lesson.",
    imageUrl: "/badges/placeholder.png",
    category: BadgeCategory.LEARNING,
  },
  {
    slug: "first-course",
    name: "Course Graduate",
    description: "Complete your first full course.",
    imageUrl: "/badges/placeholder.png",
    category: BadgeCategory.LEARNING,
  },
  {
    slug: "all-courses",
    name: "Knowledge Master",
    description: "Complete all available courses.",
    imageUrl: "/badges/placeholder.png",
    category: BadgeCategory.LEARNING,
  },

  // ── TRADING (3 badges) — shopping / USDC membership ─────────
  {
    slug: "first-usdc-payment",
    name: "First Transaction",
    description: "Make your first USDC membership payment.",
    imageUrl: "/badges/placeholder.png",
    category: BadgeCategory.TRADING,
  },
  {
    slug: "gold-member",
    name: "Gold Member",
    description: "Upgrade to GOLD membership tier.",
    imageUrl: "/badges/placeholder.png",
    category: BadgeCategory.TRADING,
  },
  {
    slug: "platinum-member",
    name: "Platinum Elite",
    description: "Upgrade to PLATINUM membership tier.",
    imageUrl: "/badges/placeholder.png",
    category: BadgeCategory.TRADING,
  },

  // ── ACHIEVEMENT (3 badges) — staking ────────────────────────
  {
    slug: "first-stake",
    name: "First Stake",
    description: "Deposit QC into staking for the first time.",
    imageUrl: "/badges/placeholder.png",
    category: BadgeCategory.ACHIEVEMENT,
  },
  {
    slug: "stake-1000-qc",
    name: "Big Staker",
    description: "Stake 1,000 or more QC at once.",
    imageUrl: "/badges/placeholder.png",
    category: BadgeCategory.ACHIEVEMENT,
    qcThreshold: 1000,
  },
  {
    slug: "staking-streak-30",
    name: "30-Day Staker",
    description: "Keep an active staking position for 30 consecutive days.",
    imageUrl: "/badges/placeholder.png",
    category: BadgeCategory.ACHIEVEMENT,
  },

  // ── SOCIAL (2 badges) — raffles + cashback ───────────────────
  {
    slug: "first-raffle-entry",
    name: "High Roller",
    description: "Enter your first raffle.",
    imageUrl: "/badges/placeholder.png",
    category: BadgeCategory.SOCIAL,
  },
  {
    slug: "first-cashback",
    name: "Cashback King",
    description: "Receive your first affiliate cashback reward.",
    imageUrl: "/badges/placeholder.png",
    category: BadgeCategory.SOCIAL,
  },

  // ── SPECIAL (2 badges) ───────────────────────────────────────
  {
    slug: "early-adopter",
    name: "Early Adopter",
    description: "One of the first 100 users to join QuackCoin.",
    imageUrl: "/badges/placeholder.png",
    category: BadgeCategory.SPECIAL,
  },
  {
    slug: "invite-master",
    name: "Invite Master",
    description: "Successfully invite 5 users to QuackCoin.",
    imageUrl: "/badges/placeholder.png",
    category: BadgeCategory.SPECIAL,
  },
];

export async function seedBadges(): Promise<void> {
  console.log("Seeding badges...");
  let created = 0;
  let skipped = 0;

  for (const badge of BADGE_CATALOG) {
    const existing = await prisma.badge.findUnique({
      where: { slug: badge.slug },
      select: { id: true },
    });
    if (existing) {
      skipped++;
      continue;
    }
    await prisma.badge.create({ data: badge });
    created++;
  }

  console.log(`Badges seeded: ${created} created, ${skipped} skipped.`);
}

// Standalone execution
if (require.main === module) {
  seedBadges()
    .then(() => prisma.$disconnect())
    .catch((e) => {
      console.error(e);
      prisma.$disconnect();
      process.exit(1);
    });
}
