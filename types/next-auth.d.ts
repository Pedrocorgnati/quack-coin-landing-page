// types/next-auth.d.ts
// Augments the NextAuth session and JWT types to expose custom user fields.

import type { DefaultSession } from "next-auth";
import type { Role, MembershipTier } from "@/lib/generated/prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      membershipTier: MembershipTier;
      membershipExpiresAt: string | null;
      twoFactorEnabled: boolean;
      twoFactorVerified: boolean;
      avatarUrl: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: Role;
    membershipTier: MembershipTier;
    membershipExpiresAt: string | null;
    twoFactorEnabled: boolean;
    twoFactorVerified: boolean;
    avatarUrl: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    membershipTier: MembershipTier;
    membershipExpiresAt: string | null;
    twoFactorEnabled: boolean;
    twoFactorVerified: boolean;
    avatarUrl: string | null;
  }
}
