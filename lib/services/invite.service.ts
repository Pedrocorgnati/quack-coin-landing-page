// lib/services/invite.service.ts
// InviteService — invite code generation, validation, and consumption.
// Registration is invite-only: a valid, unused invite code is required.

import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import type { InviteCode } from "@/lib/generated/prisma/client";

export const InviteService = {
  /**
   * Generate a new invite code (admin action).
   * @param adminId   - ID of the admin creating the code
   * @param maxUses   - Maximum number of times this code can be used
   * @param expiresAt - Optional expiry date; defaults to 30 days from now
   */
  async generate(
    adminId: string,
    maxUses: number = 1,
    expiresAt?: Date,
  ): Promise<InviteCode> {
    const code = crypto.randomBytes(8).toString("hex"); // 16-char hex, fits VarChar(20)
    const expiry = expiresAt ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    return prisma.inviteCode.create({
      data: {
        code,
        issuedById: adminId,
        maxUses,
        expiresAt: expiry,
      },
    });
  },

  /**
   * Validate an invite code.
   * Returns the `InviteCode` record if valid, otherwise `null`.
   */
  async validate(code: string): Promise<InviteCode | null> {
    const invite = await prisma.inviteCode.findUnique({
      where: { code: code.trim() },
    });

    if (!invite) return null;
    if (invite.expiresAt && invite.expiresAt < new Date()) return null;
    if (invite.useCount >= invite.maxUses) return null;

    return invite;
  },

  /**
   * Consume an invite code after successful registration.
   * Increments `useCount` and records the email used.
   */
  async consume(code: string, userEmail: string): Promise<void> {
    const invite = await prisma.inviteCode.findUnique({
      where: { code: code.trim() },
    });

    if (!invite) throw new Error("Invite code not found");

    const newCount = invite.useCount + 1;
    await prisma.inviteCode.update({
      where: { code: code.trim() },
      data: {
        useCount: newCount,
        usedByEmail: userEmail,
        usedAt: new Date(),
      },
    });
  },

  /**
   * Revoke an invite code by expiring it immediately (admin action).
   * The schema has no isRevoked flag, so we set expiresAt to now.
   */
  async revoke(id: string): Promise<void> {
    const invite = await prisma.inviteCode.findUnique({ where: { id } });
    if (!invite) throw new Error("Invite code not found");

    await prisma.inviteCode.update({
      where: { id },
      data: { expiresAt: new Date() },
    });
  },

  /**
   * List all invite codes (admin action), newest first.
   */
  async list(): Promise<InviteCode[]> {
    return prisma.inviteCode.findMany({
      orderBy: { createdAt: "desc" },
    });
  },
};
