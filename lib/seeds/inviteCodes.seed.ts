// lib/seeds/inviteCodes.seed.ts
// Seed 3 invite codes for development (single-use, valid for 30 days).
// Run via: npx tsx lib/seeds/inviteCodes.seed.ts

import { prisma } from "@/lib/prisma";
import { InviteService } from "@/lib/services/invite.service";

async function seedInviteCodes() {
  // Find or use first admin user for seeding
  let admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    select: { id: true },
  });

  if (!admin) {
    console.log("⚠️  No admin user found — creating placeholder admin for seeding");
    admin = await prisma.user.create({
      data: {
        email: "admin@quackcoin.dev",
        name: "Admin",
        role: "ADMIN",
        membershipTier: "FREE",
        passwordHash: "$2b$12$placeholderHashForDevSeedingOnly",
      },
      select: { id: true },
    });
  }

  const codes: string[] = [];
  for (let i = 0; i < 3; i++) {
    const invite = await InviteService.generate(admin.id, 1);
    codes.push(invite.code);
  }

  console.log("✅  Invite codes seeded (development):");
  codes.forEach((code, i) => console.log(`   ${i + 1}. ${code}`));
}

seedInviteCodes()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
