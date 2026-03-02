// tests/unit/membership.service.test.ts
// Unit tests for MembershipService using mocked Prisma and SiteConfigService.

import { MembershipService } from "@/lib/services/membership.service";
import { MembershipTier } from "@/lib/generated/prisma/client";

// ── Mock Prisma ───────────────────────────────────────────────

const mockTxClient = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn((fn: (tx: unknown) => Promise<unknown>) => fn(mockTxClient)),
  },
}));

// ── Mock SiteConfigService ────────────────────────────────────

jest.mock("@/lib/services/siteConfig.service", () => ({
  SiteConfigService: {
    getOrDefault: jest.fn().mockImplementation((_key: string, def: string) => Promise.resolve(def)),
  },
}));

import { prisma } from "@/lib/prisma";
import { SiteConfigService } from "@/lib/services/siteConfig.service";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPrisma = prisma as jest.Mocked<any>;
const mockSiteConfig = SiteConfigService as jest.Mocked<typeof SiteConfigService>;

beforeEach(() => {
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────

describe("MembershipService.upgrade", () => {
  it("sets tier and expiry for a new subscription", async () => {
    const now = new Date();
    mockTxClient.user.findUnique.mockResolvedValue({
      membershipTier: MembershipTier.FREE,
      membershipExpiresAt: null,
    });
    mockTxClient.user.update.mockResolvedValue({});

    await MembershipService.upgrade("user_1", MembershipTier.SILVER, 1);

    expect(mockTxClient.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user_1" },
        data: expect.objectContaining({ membershipTier: MembershipTier.SILVER }),
      }),
    );
  });

  it("extends expiry when renewing before it expires", async () => {
    const future = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000); // 10 days from now
    mockTxClient.user.findUnique.mockResolvedValue({
      membershipTier: MembershipTier.SILVER,
      membershipExpiresAt: future,
    });
    mockTxClient.user.update.mockResolvedValue({});

    await MembershipService.upgrade("user_1", MembershipTier.SILVER, 1);

    const updateCall = mockTxClient.user.update.mock.calls[0]?.[0] as {
      data: { membershipExpiresAt: Date };
    };
    const newExpiry = updateCall?.data?.membershipExpiresAt;
    expect(newExpiry).toBeDefined();
    // New expiry should be ~40 days from now (10 remaining + 30 added)
    if (newExpiry) {
      const msAdded = newExpiry.getTime() - Date.now();
      expect(msAdded).toBeGreaterThan(35 * 24 * 60 * 60 * 1000);
    }
  });

  it("does not downgrade from GOLD to SILVER", async () => {
    mockTxClient.user.findUnique.mockResolvedValue({
      membershipTier: MembershipTier.GOLD,
      membershipExpiresAt: null,
    });
    mockTxClient.user.update.mockResolvedValue({});

    await MembershipService.upgrade("user_1", MembershipTier.SILVER, 1);

    const updateCall = mockTxClient.user.update.mock.calls[0]?.[0] as {
      data: { membershipTier: MembershipTier };
    };
    expect(updateCall?.data?.membershipTier).toBe(MembershipTier.GOLD); // kept at GOLD
  });
});

// ─────────────────────────────────────────────────────────────────

describe("MembershipService.isActive", () => {
  it("returns true when tier is paid and expiry is in the future", async () => {
    const future = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    mockPrisma.user.findUnique.mockResolvedValue({
      membershipTier: MembershipTier.GOLD,
      membershipExpiresAt: future,
    } as never);

    const result = await MembershipService.isActive("user_1");
    expect(result).toBe(true);
  });

  it("returns false when membership has expired", async () => {
    const past = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
    mockPrisma.user.findUnique.mockResolvedValue({
      membershipTier: MembershipTier.SILVER,
      membershipExpiresAt: past,
    } as never);

    const result = await MembershipService.isActive("user_1");
    expect(result).toBe(false);
  });

  it("returns false for FREE tier regardless of expiry", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      membershipTier: MembershipTier.FREE,
      membershipExpiresAt: null,
    } as never);

    const result = await MembershipService.isActive("user_1");
    expect(result).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────

describe("MembershipService.getActiveBenefits", () => {
  it("returns 1x multiplier for FREE tier", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      membershipTier: MembershipTier.FREE,
      membershipExpiresAt: null,
    } as never);

    const benefits = await MembershipService.getActiveBenefits("user_1");
    expect(benefits.qcMultiplier).toBe(1.0);
    expect(benefits.stakingBonus).toBe(0);
    expect(benefits.cashbackBonus).toBe(0);
  });

  it("reads multiplier from SiteConfig for paid tier", async () => {
    const future = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    mockPrisma.user.findUnique.mockResolvedValue({
      membershipTier: MembershipTier.GOLD,
      membershipExpiresAt: future,
    } as never);
    mockSiteConfig.getOrDefault
      .mockResolvedValueOnce("2.0") // qc_multiplier
      .mockResolvedValueOnce("5") // staking_bonus
      .mockResolvedValueOnce("1"); // cashback_bonus

    const benefits = await MembershipService.getActiveBenefits("user_1");
    expect(benefits.qcMultiplier).toBe(2.0);
    expect(benefits.stakingBonus).toBe(5);
    expect(benefits.cashbackBonus).toBe(1);
  });

  it("treats expired paid member as FREE", async () => {
    const past = new Date(Date.now() - 1000);
    mockPrisma.user.findUnique.mockResolvedValue({
      membershipTier: MembershipTier.PLATINUM,
      membershipExpiresAt: past,
    } as never);

    const benefits = await MembershipService.getActiveBenefits("user_1");
    expect(benefits.qcMultiplier).toBe(1.0);
    expect(mockSiteConfig.getOrDefault).not.toHaveBeenCalled();
  });
});
