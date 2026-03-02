// lib/services/raffle.service.ts
// RaffleService — manages raffle lifecycle and ticket entry.
// State machine: UPCOMING → ACTIVE → DRAWING → COMPLETED (all transitions irreversible).

import { prisma } from "@/lib/prisma";
import { QcService } from "@/lib/services/qc.service";
import { BadgeService } from "@/lib/services/badge.service";
import { NotificationService } from "@/lib/services/notification.service";
import { RaffleStatus, NotificationType } from "@/lib/generated/prisma/client";
import type { RaffleTicket, RaffleWinner } from "@/lib/generated/prisma/client";
import {
  RaffleNotActiveError,
  MaxTicketsExceededError,
  RaffleAlreadyDrawnError,
  InvalidRaffleTransitionError,
} from "@/lib/errors/raffle.errors";

// ─────────────────────────────────────────────────────────────────
// Valid transitions
// ─────────────────────────────────────────────────────────────────

const ALLOWED_TRANSITIONS: Record<RaffleStatus, RaffleStatus | null> = {
  [RaffleStatus.UPCOMING]: RaffleStatus.ACTIVE,
  [RaffleStatus.ACTIVE]: RaffleStatus.DRAWING,
  [RaffleStatus.DRAWING]: RaffleStatus.COMPLETED,
  [RaffleStatus.COMPLETED]: null,
  [RaffleStatus.CANCELLED]: null,
};

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export interface EnterRaffleResult {
  ticket: RaffleTicket;
  totalCost: number;
  newTicketCount: number;
}

export interface DrawResult {
  winners: RaffleWinner[];
  raffleId: string;
}

// ─────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────

export const RaffleService = {
  /**
   * Enter a raffle by purchasing `ticketCount` tickets.
   * Deducts QC and creates / increments the RaffleTicket record.
   * RaffleTicket is unique per (raffleId, userId) — quantity tracks the count.
   */
  async enterRaffle(
    userId: string,
    raffleId: string,
    ticketCount: number,
  ): Promise<EnterRaffleResult> {
    if (ticketCount < 1) throw new Error("Ticket count must be at least 1");

    const raffle = await prisma.raffle.findUnique({
      where: { id: raffleId },
      select: {
        id: true,
        status: true,
        ticketPriceQc: true,
        maxTickets: true,
        title: true,
      },
    });

    if (!raffle) throw new Error("Raffle not found");
    if (raffle.status !== RaffleStatus.ACTIVE) throw new RaffleNotActiveError(raffleId);

    // Check total ticket cap
    if (raffle.maxTickets !== null) {
      const soldCount = await prisma.raffleTicket.aggregate({
        where: { raffleId },
        _sum: { quantity: true },
      });
      const sold = soldCount._sum.quantity ?? 0;
      const available = raffle.maxTickets - sold;
      if (ticketCount > available) throw new MaxTicketsExceededError(ticketCount, available);
    }

    const totalCost = ticketCount * raffle.ticketPriceQc;
    const idempotencyKey = `raffle_entry:${userId}:${raffleId}:${Date.now()}`;

    // Deduct QC
    await QcService.deduct(userId, totalCost, `Raffle entry: ${raffle.title}`, idempotencyKey);

    // Upsert ticket record (increment quantity if already entered)
    const ticket = await prisma.raffleTicket.upsert({
      where: { raffleId_userId: { raffleId, userId } },
      update: { quantity: { increment: ticketCount } },
      create: { raffleId, userId, quantity: ticketCount },
    });

    // Fire-and-forget badge check for first raffle entry
    void BadgeService.check({ type: "raffle_entry", userId }).catch(() => {});

    return { ticket, totalCost, newTicketCount: ticket.quantity };
  },

  // ─────────────────────────────────────────────────────────────────
  // Lifecycle transitions
  // ─────────────────────────────────────────────────────────────────

  async activate(raffleId: string): Promise<void> {
    const raffle = await prisma.raffle.findUniqueOrThrow({ where: { id: raffleId } });
    if (ALLOWED_TRANSITIONS[raffle.status] !== RaffleStatus.ACTIVE) {
      throw new InvalidRaffleTransitionError(raffle.status, "ACTIVE");
    }
    // Prevent activating an already-past raffle
    if (raffle.drawAt < new Date()) {
      throw new Error("Cannot activate a raffle whose draw time is already past");
    }
    await prisma.raffle.update({ where: { id: raffleId }, data: { status: RaffleStatus.ACTIVE } });
  },

  async startDrawing(raffleId: string): Promise<void> {
    const raffle = await prisma.raffle.findUniqueOrThrow({ where: { id: raffleId } });
    if (ALLOWED_TRANSITIONS[raffle.status] !== RaffleStatus.DRAWING) {
      throw new InvalidRaffleTransitionError(raffle.status, "DRAWING");
    }
    await prisma.raffle.update({ where: { id: raffleId }, data: { status: RaffleStatus.DRAWING } });
  },

  // ─────────────────────────────────────────────────────────────────
  // Drawing algorithm
  // ─────────────────────────────────────────────────────────────────

  /**
   * Draw winners for a raffle using a cryptographically fair Fisher-Yates shuffle.
   * Selects 1 winner (raffle has no winnerCount field — defaults to 1).
   * Distributes QC prize if prizeDescription contains a parseable amount.
   */
  async drawWinners(raffleId: string): Promise<DrawResult> {
    const raffle = await prisma.raffle.findUniqueOrThrow({
      where: { id: raffleId },
      include: {
        tickets: { select: { userId: true, quantity: true } },
        winners: { select: { id: true } },
      },
    });

    if (raffle.status === RaffleStatus.COMPLETED || raffle.winners.length > 0) {
      throw new RaffleAlreadyDrawnError(raffleId);
    }
    if (
      raffle.status !== RaffleStatus.ACTIVE &&
      raffle.status !== RaffleStatus.DRAWING
    ) {
      throw new InvalidRaffleTransitionError(raffle.status, "DRAWING");
    }

    // Transition to DRAWING
    await prisma.raffle.update({ where: { id: raffleId }, data: { status: RaffleStatus.DRAWING } });

    // Expand tickets into a flat pool (each ticket = one entry)
    const pool: string[] = [];
    for (const ticket of raffle.tickets) {
      for (let i = 0; i < ticket.quantity; i++) {
        pool.push(ticket.userId);
      }
    }

    if (pool.length === 0) {
      // No entries — mark completed without a winner
      await prisma.raffle.update({ where: { id: raffleId }, data: { status: RaffleStatus.COMPLETED } });
      return { winners: [], raffleId };
    }

    // Fisher-Yates shuffle with crypto.getRandomValues
    const shuffled = fisherYatesShuffle(pool);

    // Pick 1 unique winner
    const winnerUserIds = [...new Set(shuffled)].slice(0, 1);

    const winnerRecords: RaffleWinner[] = [];

    await prisma.$transaction(async (tx) => {
      for (const winnerUserId of winnerUserIds) {
        const winner = await tx.raffleWinner.create({
          data: {
            raffleId,
            userId: winnerUserId,
            prizeDetail: raffle.prizeDescription,
            drawnAt: new Date(),
          },
        });
        winnerRecords.push(winner);
      }

      await tx.raffle.update({ where: { id: raffleId }, data: { status: RaffleStatus.COMPLETED } });
    });

    // Notify winners (fire-and-forget)
    for (const winnerId of winnerUserIds) {
      void NotificationService.send(winnerId, NotificationType.RAFFLE_WON, {
        type: NotificationType.RAFFLE_WON,
        data: {
          raffleId,
          raffleTitle: raffle.title,
          prizeDetail: raffle.prizeDescription,
        },
      }).catch(() => {});
    }

    return { winners: winnerRecords, raffleId };
  },

  /**
   * Get a user's ticket record for a raffle.
   */
  async getMyTickets(
    userId: string,
    raffleId: string,
  ): Promise<{ count: number; totalSpent: number }> {
    const raffle = await prisma.raffle.findUnique({
      where: { id: raffleId },
      select: { ticketPriceQc: true },
    });
    if (!raffle) return { count: 0, totalSpent: 0 };

    const ticket = await prisma.raffleTicket.findUnique({
      where: { raffleId_userId: { raffleId, userId } },
      select: { quantity: true },
    });

    const count = ticket?.quantity ?? 0;
    return { count, totalSpent: count * raffle.ticketPriceQc };
  },
};

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

/**
 * Cryptographically fair Fisher-Yates shuffle using crypto.getRandomValues.
 * Works in Node.js (uses globalThis.crypto available in Node 18+).
 */
function fisherYatesShuffle<T>(array: T[]): T[] {
  const arr = [...array];
  const n = arr.length;
  // Generate all random values at once
  const randomValues = new Uint32Array(n);
  globalThis.crypto.getRandomValues(randomValues);

  for (let i = n - 1; i > 0; i--) {
    // Map random uint32 to [0, i] — mod bias is negligible for typical raffle sizes
    const j = (randomValues[i] ?? 0) % (i + 1);
    const tmp = arr[i] as T;
    arr[i] = arr[j] as T;
    arr[j] = tmp;
  }
  return arr;
}
