// tests/unit/raffle.service.test.ts
// Unit tests for RaffleService.

import { RaffleService } from "@/lib/services/raffle.service";
import { RaffleStatus } from "@/lib/generated/prisma/client";
import {
  RaffleNotActiveError,
  MaxTicketsExceededError,
  RaffleAlreadyDrawnError,
  InvalidRaffleTransitionError,
} from "@/lib/errors/raffle.errors";

// ── Mock Prisma ───────────────────────────────────────────────

const mockTxClient = {
  raffleWinner: { create: jest.fn() },
  raffle: { update: jest.fn() },
};

jest.mock("@/lib/prisma", () => ({
  prisma: {
    raffle: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    raffleTicket: {
      aggregate: jest.fn(),
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
    raffleWinner: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock("@/lib/services/qc.service", () => ({
  QcService: {
    deduct: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock("@/lib/services/badge.service", () => ({
  BadgeService: {
    check: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock("@/lib/services/notification.service", () => ({
  NotificationService: {
    send: jest.fn().mockResolvedValue(undefined),
  },
}));

const { prisma } = jest.requireMock("@/lib/prisma");
const { QcService } = jest.requireMock("@/lib/services/qc.service");

// ─────────────────────────────────────────────────────────────────
// enterRaffle
// ─────────────────────────────────────────────────────────────────

const ACTIVE_RAFFLE = {
  id: "raffle-1",
  status: RaffleStatus.ACTIVE,
  ticketPriceQc: 10,
  maxTickets: null,
  title: "Test Raffle",
};

describe("RaffleService.enterRaffle", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.raffle.findUnique.mockResolvedValue(ACTIVE_RAFFLE);
    prisma.raffleTicket.aggregate.mockResolvedValue({ _sum: { quantity: 0 } });
    prisma.raffleTicket.upsert.mockResolvedValue({ quantity: 2 });
  });

  it("deducts correct QC (ticketCount × ticketPrice)", async () => {
    await RaffleService.enterRaffle("user-1", "raffle-1", 3);
    expect(QcService.deduct).toHaveBeenCalledWith(
      "user-1",
      30, // 3 × 10
      expect.stringContaining("Raffle entry"),
      expect.any(String),
    );
  });

  it("returns ticket count and total cost", async () => {
    prisma.raffleTicket.upsert.mockResolvedValue({ quantity: 3 });
    const result = await RaffleService.enterRaffle("user-1", "raffle-1", 3);
    expect(result.totalCost).toBe(30);
    expect(result.newTicketCount).toBe(3);
  });

  it("throws RaffleNotActiveError for non-ACTIVE raffle", async () => {
    prisma.raffle.findUnique.mockResolvedValue({
      ...ACTIVE_RAFFLE,
      status: RaffleStatus.UPCOMING,
    });
    await expect(RaffleService.enterRaffle("user-1", "raffle-1", 1)).rejects.toThrow(
      RaffleNotActiveError,
    );
  });

  it("throws RaffleNotActiveError for COMPLETED raffle", async () => {
    prisma.raffle.findUnique.mockResolvedValue({
      ...ACTIVE_RAFFLE,
      status: RaffleStatus.COMPLETED,
    });
    await expect(RaffleService.enterRaffle("user-1", "raffle-1", 1)).rejects.toThrow(
      RaffleNotActiveError,
    );
  });

  it("enforces maxTickets cap", async () => {
    prisma.raffle.findUnique.mockResolvedValue({
      ...ACTIVE_RAFFLE,
      maxTickets: 10,
    });
    prisma.raffleTicket.aggregate.mockResolvedValue({ _sum: { quantity: 8 } });
    // Only 2 remain, requesting 3
    await expect(RaffleService.enterRaffle("user-1", "raffle-1", 3)).rejects.toThrow(
      MaxTicketsExceededError,
    );
  });

  it("allows entry when maxTickets not exceeded", async () => {
    prisma.raffle.findUnique.mockResolvedValue({
      ...ACTIVE_RAFFLE,
      maxTickets: 10,
    });
    prisma.raffleTicket.aggregate.mockResolvedValue({ _sum: { quantity: 5 } });
    prisma.raffleTicket.upsert.mockResolvedValue({ quantity: 3 });
    const result = await RaffleService.enterRaffle("user-1", "raffle-1", 3);
    expect(result.newTicketCount).toBe(3);
  });
});

// ─────────────────────────────────────────────────────────────────
// State transitions
// ─────────────────────────────────────────────────────────────────

describe("RaffleService state transitions", () => {
  beforeEach(() => jest.clearAllMocks());

  it("activate: transitions UPCOMING → ACTIVE", async () => {
    prisma.raffle.findUniqueOrThrow.mockResolvedValue({
      id: "r1",
      status: RaffleStatus.UPCOMING,
      drawAt: new Date(Date.now() + 86400000),
    });
    await RaffleService.activate("r1");
    expect(prisma.raffle.update).toHaveBeenCalledWith({
      where: { id: "r1" },
      data: { status: RaffleStatus.ACTIVE },
    });
  });

  it("activate: throws InvalidRaffleTransitionError from COMPLETED", async () => {
    prisma.raffle.findUniqueOrThrow.mockResolvedValue({
      id: "r1",
      status: RaffleStatus.COMPLETED,
      drawAt: new Date(Date.now() + 86400000),
    });
    await expect(RaffleService.activate("r1")).rejects.toThrow(InvalidRaffleTransitionError);
  });

  it("activate: throws if drawAt is in the past", async () => {
    prisma.raffle.findUniqueOrThrow.mockResolvedValue({
      id: "r1",
      status: RaffleStatus.UPCOMING,
      drawAt: new Date(Date.now() - 1000),
    });
    await expect(RaffleService.activate("r1")).rejects.toThrow(/past/);
  });
});

// ─────────────────────────────────────────────────────────────────
// drawWinners
// ─────────────────────────────────────────────────────────────────

describe("RaffleService.drawWinners", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((fn: (tx: typeof mockTxClient) => Promise<unknown>) =>
      fn(mockTxClient),
    );
  });

  it("throws RaffleAlreadyDrawnError if already COMPLETED", async () => {
    prisma.raffle.findUniqueOrThrow.mockResolvedValue({
      id: "r1",
      status: RaffleStatus.COMPLETED,
      tickets: [],
      winners: [{ id: "w1" }],
      title: "Test",
      prizeDescription: "Prize",
    });
    await expect(RaffleService.drawWinners("r1")).rejects.toThrow(RaffleAlreadyDrawnError);
  });

  it("throws RaffleAlreadyDrawnError if winners already exist", async () => {
    prisma.raffle.findUniqueOrThrow.mockResolvedValue({
      id: "r1",
      status: RaffleStatus.ACTIVE,
      tickets: [{ userId: "u1", quantity: 1 }],
      winners: [{ id: "w1" }],
      title: "Test",
      prizeDescription: "Prize",
    });
    await expect(RaffleService.drawWinners("r1")).rejects.toThrow(RaffleAlreadyDrawnError);
  });

  it("selects a winner from ticket pool", async () => {
    const tickets = [
      { userId: "u1", quantity: 3 },
      { userId: "u2", quantity: 2 },
    ];
    prisma.raffle.findUniqueOrThrow.mockResolvedValue({
      id: "r1",
      status: RaffleStatus.ACTIVE,
      tickets,
      winners: [],
      title: "Test Raffle",
      prizeDescription: "100 QC",
    });
    mockTxClient.raffleWinner.create.mockResolvedValue({
      id: "w1",
      raffleId: "r1",
      userId: "u1",
      prizeDetail: "100 QC",
      drawnAt: new Date(),
    });
    mockTxClient.raffle.update.mockResolvedValue({});

    const result = await RaffleService.drawWinners("r1");
    expect(result.winners).toHaveLength(1);
     
    expect(["u1", "u2"]).toContain(result.winners[0]!.userId);
  });

  it("returns empty winners list if no tickets", async () => {
    prisma.raffle.findUniqueOrThrow.mockResolvedValue({
      id: "r1",
      status: RaffleStatus.ACTIVE,
      tickets: [],
      winners: [],
      title: "Empty Raffle",
      prizeDescription: "Nothing",
    });
    prisma.raffle.update.mockResolvedValue({});

    const result = await RaffleService.drawWinners("r1");
    expect(result.winners).toHaveLength(0);
  });
});
