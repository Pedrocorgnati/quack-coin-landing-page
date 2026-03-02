// tests/unit/usdc.service.test.ts
// Unit tests for UsdcService using mocked Prisma, Redis, and SolanaClient.

import { UsdcService } from "@/lib/services/usdc.service";
import { MembershipTier, PaymentStatus } from "@/lib/generated/prisma/client";
import {
  PaymentNotFoundError,
  PaymentAlreadyProcessedError,
  OnChainVerificationError,
} from "@/lib/errors/membership.errors";

// ── Mock Prisma ───────────────────────────────────────────────

const mockTxClient = {
  solanaPaymentSession: { create: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
  membershipPayment: { create: jest.fn(), updateMany: jest.fn() },
};

jest.mock("@/lib/prisma", () => ({
  prisma: {
    solanaPaymentSession: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    membershipPayment: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn((fn: (tx: unknown) => Promise<unknown>) => fn(mockTxClient)),
  },
}));

// ── Mock Redis ────────────────────────────────────────────────

jest.mock("@/lib/redis", () => ({
  redis: {
    set: jest.fn().mockResolvedValue("OK"),
    del: jest.fn().mockResolvedValue(1),
    get: jest.fn().mockResolvedValue(null),
  },
}));

// ── Mock SolanaClient ─────────────────────────────────────────

jest.mock("@/lib/solana/client", () => ({
  SolanaClient: {
    verifyUsdcTransfer: jest.fn().mockResolvedValue(true),
  },
}));

// ── Mock SiteConfigService ────────────────────────────────────

jest.mock("@/lib/services/siteConfig.service", () => ({
  SiteConfigService: {
    getOrDefault: jest.fn().mockResolvedValue("9.99"),
  },
}));

// ── Mock MembershipService ────────────────────────────────────

jest.mock("@/lib/services/membership.service", () => ({
  MembershipService: {
    upgrade: jest.fn().mockResolvedValue(undefined),
  },
}));

// ── Mock env ──────────────────────────────────────────────────

jest.mock("@/lib/env", () => ({
  env: {
    SOLANA_RECIPIENT_ADDRESS: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    USDC_MINT_ADDRESS: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    SOLANA_RPC_URL: "https://api.mainnet-beta.solana.com",
  },
}));

import { prisma } from "@/lib/prisma";
import { SolanaClient } from "@/lib/solana/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPrisma = prisma as jest.Mocked<any>;
const mockSolana = SolanaClient as jest.Mocked<typeof SolanaClient>;

beforeEach(() => {
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────

describe("UsdcService.cancelExpiredPayments", () => {
  it("marks PENDING sessions with past expiresAt as EXPIRED", async () => {
    mockPrisma.solanaPaymentSession.updateMany.mockResolvedValue({ count: 3 });
    mockPrisma.solanaPaymentSession.findMany.mockResolvedValue([
      { id: "sess_1" },
      { id: "sess_2" },
      { id: "sess_3" },
    ] as never);

    const count = await UsdcService.cancelExpiredPayments();
    expect(count).toBe(3);
    expect(mockPrisma.solanaPaymentSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: PaymentStatus.PENDING }),
        data: { status: PaymentStatus.EXPIRED },
      }),
    );
  });

  it("returns 0 when nothing to expire", async () => {
    mockPrisma.solanaPaymentSession.updateMany.mockResolvedValue({ count: 0 });
    const count = await UsdcService.cancelExpiredPayments();
    expect(count).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────

describe("UsdcService.confirmPayment", () => {
  const BASE_SESSION = {
    id: "sess_1",
    userId: "user_1",
    status: PaymentStatus.PENDING,
    amountUsdc: "9.99",
    purposeId: MembershipTier.SILVER,
    txSignature: null,
    user: { id: "user_1", email: "test@example.com", name: "Test" },
  };

  it("confirms a valid payment and upgrades membership", async () => {
    mockPrisma.solanaPaymentSession.findUnique.mockResolvedValue(BASE_SESSION as never);
    mockPrisma.solanaPaymentSession.findFirst.mockResolvedValue(null);
    mockTxClient.solanaPaymentSession.update.mockResolvedValue({});
    mockTxClient.membershipPayment.updateMany.mockResolvedValue({ count: 1 });

    await expect(
      UsdcService.confirmPayment("sess_1", "sig_abc123"),
    ).resolves.toBeUndefined();

    expect(mockSolana.verifyUsdcTransfer).toHaveBeenCalledWith(
      "sig_abc123",
      9.99,
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    );
  });

  it("throws PaymentNotFoundError when session does not exist", async () => {
    mockPrisma.solanaPaymentSession.findUnique.mockResolvedValue(null);

    await expect(UsdcService.confirmPayment("sess_x", "sig")).rejects.toBeInstanceOf(
      PaymentNotFoundError,
    );
  });

  it("throws PaymentAlreadyProcessedError for a non-PENDING session", async () => {
    mockPrisma.solanaPaymentSession.findUnique.mockResolvedValue({
      ...BASE_SESSION,
      status: PaymentStatus.CONFIRMED,
    } as never);

    await expect(UsdcService.confirmPayment("sess_1", "sig")).rejects.toBeInstanceOf(
      PaymentAlreadyProcessedError,
    );
  });

  it("throws PaymentAlreadyProcessedError for duplicate txSignature", async () => {
    mockPrisma.solanaPaymentSession.findUnique.mockResolvedValue(BASE_SESSION as never);
    mockPrisma.solanaPaymentSession.findFirst.mockResolvedValue({
      id: "sess_other",
    } as never);

    await expect(UsdcService.confirmPayment("sess_1", "sig_dup")).rejects.toBeInstanceOf(
      PaymentAlreadyProcessedError,
    );
  });

  it("throws OnChainVerificationError when on-chain check fails", async () => {
    mockPrisma.solanaPaymentSession.findUnique.mockResolvedValue(BASE_SESSION as never);
    mockPrisma.solanaPaymentSession.findFirst.mockResolvedValue(null);
    mockSolana.verifyUsdcTransfer.mockResolvedValueOnce(false);

    await expect(UsdcService.confirmPayment("sess_1", "sig_bad")).rejects.toBeInstanceOf(
      OnChainVerificationError,
    );
  });
});
