// tests/unit/qc.service.test.ts
// Unit tests for QcService using a mocked Prisma client.
// Run with: npx jest tests/unit/qc.service.test.ts

import { QcService } from "@/lib/services/qc.service";
import { InsufficientQcError } from "@/lib/errors/qc.errors";
import { TransactionType } from "@/lib/generated/prisma/client";

// ── Mock SiteConfigService (needed by getBalance -> _computeBalance via expiry) ──

jest.mock("@/lib/services/siteConfig.service", () => ({
  SiteConfigService: {
    getOrDefault: jest.fn().mockResolvedValue("false"),
  },
}));

// ── Mock BadgeService ─────────────────────────────────────────

jest.mock("@/lib/services/badge.service", () => ({
  BadgeService: {
    check: jest.fn().mockResolvedValue(undefined),
  },
}));

// ── Mock Prisma ───────────────────────────────────────────────

const mockTxClient = {
  quackCoinTransaction: {
    findUnique: jest.fn(),
    create: jest.fn(),
    aggregate: jest.fn(),
  },
};

jest.mock("@/lib/prisma", () => ({
  prisma: {
    quackCoinTransaction: {
      findUnique: jest.fn(),
      create: jest.fn(),
      aggregate: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn((fn: (tx: unknown) => Promise<unknown>) => fn(mockTxClient)),
  },
}));

import { prisma } from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPrisma = prisma as jest.Mocked<any>;

beforeEach(() => {
  jest.clearAllMocks();
});

// ── QcService.earn ────────────────────────────────────────────

describe("QcService.earn", () => {
  it("creates a new transaction for a fresh idempotency key", async () => {
    const txRecord = {
      id: "tx_1",
      userId: "user_1",
      amount: 10,
      type: TransactionType.EARN,
      reason: "login",
      idempotencyKey: "login:user_1:2026-02-28",
      referenceId: null,
      referenceType: null,
      createdAt: new Date(),
    };

    mockTxClient.quackCoinTransaction.findUnique.mockResolvedValueOnce(null);
    mockTxClient.quackCoinTransaction.create.mockResolvedValueOnce(txRecord);
    // getBalance inside fire-and-forget:
    mockPrisma.quackCoinTransaction.aggregate.mockResolvedValue({ _sum: { amount: 10 } });

    const result = await QcService.earn("user_1", 10, "login", "login:user_1:2026-02-28");

    expect(mockTxClient.quackCoinTransaction.findUnique).toHaveBeenCalledWith({
      where: { idempotencyKey: "login:user_1:2026-02-28" },
    });
    expect(mockTxClient.quackCoinTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user_1",
        amount: 10,
        type: TransactionType.EARN,
        reason: "login",
        idempotencyKey: "login:user_1:2026-02-28",
      }),
    });
    expect(result).toEqual(txRecord);
  });

  it("returns existing transaction for duplicate idempotency key (idempotent)", async () => {
    const existingTx = {
      id: "tx_existing",
      userId: "user_1",
      amount: 10,
      type: TransactionType.EARN,
      reason: "login",
      idempotencyKey: "login:user_1:2026-02-28",
      referenceId: null,
      referenceType: null,
      createdAt: new Date(),
    };

    mockTxClient.quackCoinTransaction.findUnique.mockResolvedValueOnce(existingTx);

    const result = await QcService.earn("user_1", 10, "login", "login:user_1:2026-02-28");

    expect(mockTxClient.quackCoinTransaction.create).not.toHaveBeenCalled();
    expect(result).toEqual(existingTx);
  });

  it("passes referenceId and referenceType when provided", async () => {
    const txRecord = {
      id: "tx_ref",
      userId: "user_1",
      amount: 50,
      type: TransactionType.EARN,
      reason: "cashback_claimed",
      idempotencyKey: "cashback:cb_1",
      referenceId: "cb_1",
      referenceType: "cashback",
      createdAt: new Date(),
    };

    mockTxClient.quackCoinTransaction.findUnique.mockResolvedValueOnce(null);
    mockTxClient.quackCoinTransaction.create.mockResolvedValueOnce(txRecord);
    mockPrisma.quackCoinTransaction.aggregate.mockResolvedValue({ _sum: { amount: 50 } });

    const result = await QcService.earn("user_1", 50, "cashback_claimed", "cashback:cb_1", {
      referenceId: "cb_1",
      referenceType: "cashback",
    });

    expect(mockTxClient.quackCoinTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        referenceId: "cb_1",
        referenceType: "cashback",
      }),
    });
    expect(result).toEqual(txRecord);
  });
});

// ── QcService.deduct ──────────────────────────────────────────

describe("QcService.deduct", () => {
  it("deducts successfully when balance is sufficient", async () => {
    const txRecord = {
      id: "tx_spend",
      userId: "user_1",
      amount: -50,
      type: TransactionType.SPEND,
      reason: "raffle_ticket",
      idempotencyKey: "raffle:1:user_1",
      referenceId: null,
      referenceType: null,
      createdAt: new Date(),
    };

    mockTxClient.quackCoinTransaction.findUnique.mockResolvedValueOnce(null);
    mockTxClient.quackCoinTransaction.aggregate.mockResolvedValueOnce({ _sum: { amount: 200 } });
    mockTxClient.quackCoinTransaction.create.mockResolvedValueOnce(txRecord);

    const result = await QcService.deduct("user_1", 50, "raffle_ticket", "raffle:1:user_1");

    expect(mockTxClient.quackCoinTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        amount: -50,
        type: TransactionType.SPEND,
      }),
    });
    expect(result).toEqual(txRecord);
  });

  it("throws InsufficientQcError when balance is too low", async () => {
    mockTxClient.quackCoinTransaction.findUnique.mockResolvedValueOnce(null);
    mockTxClient.quackCoinTransaction.aggregate.mockResolvedValueOnce({ _sum: { amount: 10 } });

    await expect(
      QcService.deduct("user_1", 50, "raffle_ticket", "raffle:1:user_1"),
    ).rejects.toThrow(InsufficientQcError);
  });

  it("returns existing transaction for duplicate idempotency key (idempotent)", async () => {
    const existingTx = {
      id: "tx_spend_existing",
      userId: "user_1",
      amount: -50,
      type: TransactionType.SPEND,
      reason: "raffle_ticket",
      idempotencyKey: "raffle:1:user_1",
      referenceId: null,
      referenceType: null,
      createdAt: new Date(),
    };

    mockTxClient.quackCoinTransaction.findUnique.mockResolvedValueOnce(existingTx);

    const result = await QcService.deduct("user_1", 50, "raffle_ticket", "raffle:1:user_1");

    expect(mockTxClient.quackCoinTransaction.aggregate).not.toHaveBeenCalled();
    expect(mockTxClient.quackCoinTransaction.create).not.toHaveBeenCalled();
    expect(result).toEqual(existingTx);
  });
});

// ── QcService.getBalance ──────────────────────────────────────

describe("QcService.getBalance", () => {
  it("returns correct sum from ledger", async () => {
    mockPrisma.quackCoinTransaction.aggregate.mockResolvedValueOnce({
      _sum: { amount: 350 },
    });

    const balance = await QcService.getBalance("user_1");
    expect(balance).toBe(350);
  });

  it("returns 0 when no transactions exist (null sum)", async () => {
    mockPrisma.quackCoinTransaction.aggregate.mockResolvedValueOnce({
      _sum: { amount: null },
    });

    const balance = await QcService.getBalance("user_1");
    expect(balance).toBe(0);
  });
});

// ── QcService.getTransactions ─────────────────────────────────

describe("QcService.getTransactions", () => {
  it("returns paginated transaction list with correct meta", async () => {
    const txList = [
      {
        id: "tx_1",
        userId: "user_1",
        amount: 10,
        type: TransactionType.EARN,
        reason: "login",
        idempotencyKey: "k1",
        createdAt: new Date(),
      },
    ];

    mockPrisma.quackCoinTransaction.findMany.mockResolvedValueOnce(txList);
    mockPrisma.quackCoinTransaction.count.mockResolvedValueOnce(1);

    const result = await QcService.getTransactions("user_1", { page: 1, limit: 10 });

    expect(result.data).toEqual(txList);
    expect(result.meta.total).toBe(1);
    expect(result.meta.totalPages).toBe(1);
    expect(result.meta.hasNext).toBe(false);
    expect(result.meta.hasPrev).toBe(false);
  });
});
