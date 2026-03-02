// lib/auth/config.ts
// NextAuth 4 configuration — Credentials provider with custom session/JWT.
// Uses our own Session model (not NextAuth adapter tables).

import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";
import type { Role, MembershipTier } from "@/lib/generated/prisma/client";
import { eventQueue } from "@/lib/events/eventQueue";
import { BadgeService } from "@/lib/services/badge.service";
import { getLoginStreak } from "@/lib/utils/loginStreak";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 }, // 7 days
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
          select: {
            id: true,
            email: true,
            name: true,
            passwordHash: true,
            role: true,
            membershipTier: true,
            membershipExpiresAt: true,
            twoFactorEnabled: true,
            avatarUrl: true,
            isBanned: true,
            emailVerified: true,
          },
        });

        if (!user || !user.passwordHash) return null;
        if (user.isBanned) throw new Error("BANNED");

        const isValid = await compare(credentials.password, user.passwordHash);
        if (!isValid) return null;

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        }).catch(() => null);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          membershipTier: user.membershipTier,
          membershipExpiresAt: user.membershipExpiresAt?.toISOString() ?? null,
          twoFactorEnabled: user.twoFactorEnabled,
          twoFactorVerified: false, // must pass 2FA challenge
          avatarUrl: user.avatarUrl,
        };
      },
    }),
  ],
  events: {
    async signIn({ user }) {
      // Fire daily login QC event. Fire-and-forget so it never blocks login.
      if (user.id) {
        eventQueue.enqueueAsync({ type: "daily_login", userId: user.id });

        // Badge check for login streak (fire-and-forget).
        // Must run AFTER the daily_login transaction is committed, so we defer
        // via a microtask to let the event queue flush first.
        void Promise.resolve().then(async () => {
          const consecutiveDays = await getLoginStreak(user.id!);
          await BadgeService.check({ type: "login", userId: user.id!, consecutiveDays });
        }).catch(() => {});
      }
    },
  },

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: Role }).role;
        token.membershipTier = (user as { membershipTier: MembershipTier }).membershipTier;
        token.membershipExpiresAt = (user as { membershipExpiresAt: string | null }).membershipExpiresAt;
        token.twoFactorEnabled = (user as { twoFactorEnabled: boolean }).twoFactorEnabled;
        token.twoFactorVerified = false;
        token.avatarUrl = (user as { avatarUrl: string | null }).avatarUrl;
      }
      if (trigger === "update" && session) {
        if (session.twoFactorVerified !== undefined) token.twoFactorVerified = session.twoFactorVerified;
        if (session.membershipTier) token.membershipTier = session.membershipTier;
        if (session.avatarUrl !== undefined) token.avatarUrl = session.avatarUrl;
        if (session.name !== undefined) token.name = session.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.membershipTier = token.membershipTier as MembershipTier;
        session.user.membershipExpiresAt = token.membershipExpiresAt as string | null;
        session.user.twoFactorEnabled = token.twoFactorEnabled as boolean;
        session.user.twoFactorVerified = token.twoFactorVerified as boolean;
        session.user.avatarUrl = token.avatarUrl as string | null;
      }
      return session;
    },
  },
};
