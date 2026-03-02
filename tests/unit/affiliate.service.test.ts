// tests/unit/affiliate.service.test.ts
// Unit tests for AffiliateService — link generation, click tracking (dedup), and cashback.

import { AffiliateService } from "@/lib/services/affiliate.service";

// ── Mock nanoid ───────────────────────────────────────────────

jest.mock("nanoid", () => ({
  nanoid: jest.fn().mockReturnValue("TESTCODE01"),
}));

// ── Mock SiteConfigService ────────────────────────────────────

jest.mock("@/lib/services/siteConfig.service", () => ({
  SiteConfigService: {
    getOrDefault: jest.fn().mockImplementation(async (key: string) => {
      const defaults: Record<string, string> = {
        "cashback.rate": "0.05",
        "cashback.window_days": "30",
        "cashback.min_qc": "1",
      };
      return defaults[key] ?? "0";
    }),
  },
}));

// ── Mock QcService ────────────────────────────────────────────

jest.mock("@/lib/services/qc.service", () => ({
  QcService: {
    earn: jest.fn().mockResolvedValue({ id: "tx_1", amount: 5 }),
  },
}));

// ── Mock NotificationService ──────────────────────────────────

jest.mock("@/lib/services/notification.service", () => ({
  NotificationService: {
    send: jest.fn().mockResolvedValue(undefined),
  },
}));

// ── Mock Prisma ───────────────────────────────────────────────

jest.mock("@/lib/prisma", () => ({
  prisma: {
    affiliateLink: {
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    affiliateClick: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    cashbackTransaction: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      aggregate: jest.fn(),
    },
    $transaction: jest.fn((ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
  },
}));

import { prisma } from "@/lib/prisma";
import { QcService } from "@/lib/services/qc.service";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPrisma = prisma as jest.Mocked<any>;
const mockQc = QcService as jest.Mocked<typeof QcService>;

beforeEach(() => {
  jest.clearAllMocks();
});

// ── AffiliateService.generateLink ────────────────────────────

describe("AffiliateService.generateLink", () => {
  it("creates an affiliate link with a nanoid code", async () => {
    const createdLink = {
      id: "link_1",
      userId: "user_1",
      code: "TESTCODE01",
      url: "https://quackcoin.io",
      totalClicks: 0,
      totalEarned: 0,
    };

    mockPrisma.affiliateLink.create.mockResolvedValueOnce(createdLink);

    const result = await AffiliateService.generateLink("user_1");

    expect(mockPrisma.affiliateLink.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user_1",
        code: "TESTCODE01",
      }),
    });
    expect(result).toEqual(createdLink);
  });

  it("uses targetUrl when provided", async () => {
    mockPrisma.affiliateLink.create.mockResolvedValueOnce({
      id: "link_2",
      userId: "user_1",
      code: "TESTCODE01",
      url: "https://custom.io/page",
    });

    await AffiliateService.generateLink("user_1", "https://custom.io/page");

    expect(mockPrisma.affiliateLink.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ url: "https://custom.io/page" }),
    });
  });
});

// ── AffiliateService.trackClick ──────────────────────────────

describe("AffiliateService.trackClick", () => {
  it("records a new click when no duplicate exists", async () => {
    mockPrisma.affiliateClick.findFirst.mockResolvedValueOnce(null);
    mockPrisma.affiliateClick.create.mockResolvedValueOnce({ id: "click_1" });
    mockPrisma.affiliateLink.update.mockResolvedValueOnce({});

    await AffiliateService.trackClick("link_1", "1.2.3.4", "Mozilla/5.0");

    expect(mockPrisma.affiliateClick.create).toHaveBeenCalled();
    expect(mockPrisma.affiliateLink.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "link_1" },
        data: { totalClicks: { increment: 1 } },
      }),
    );
  });

  it("skips click when IP was seen within 24h (deduplication)", async () => {
    mockPrisma.affiliateClick.findFirst.mockResolvedValueOnce({ id: "click_existing" });

    await AffiliateService.trackClick("link_1", "1.2.3.4", null);

    // Should not create a new click record
    expect(mockPrisma.affiliateClick.create).not.toHaveBeenCalled();
    expect(mockPrisma.affiliateLink.update).not.toHaveBeenCalled();
  });

  it("records click when IP is null (anonymous traffic)", async () => {
    // When IP is null, we skip the dedup check entirely
    mockPrisma.affiliateClick.create.mockResolvedValueOnce({ id: "click_anon" });
    mockPrisma.affiliateLink.update.mockResolvedValueOnce({});

    await AffiliateService.trackClick("link_1", null, null);

    // findFirst should NOT be called when ip is null
    expect(mockPrisma.affiliateClick.findFirst).not.toHaveBeenCalled();
    expect(mockPrisma.affiliateClick.create).toHaveBeenCalled();
  });
});

// ── AffiliateService.createCashback ──────────────────────────

describe("AffiliateService.createCashback", () => {
  const NOW_MS = new Date("2026-02-28T12:00:00Z").getTime();

  beforeEach(() => {
    jest.spyOn(Date, "now").mockReturnValue(NOW_MS);
  });

  afterEach(() => {
    jest.spyOn(Date, "now").mockRestore();
  });

  const click = {
    id: "click_1",
    affiliateLinkId: "link_1",
    createdAt: new Date(NOW_MS - 24 * 60 * 60 * 1000), // 1 day ago (within 30-day window)
    affiliateLink: { userId: "user_link_owner" },
  };

  it("creates cashback for a valid click within conversion window", async () => {
    mockPrisma.affiliateClick.findUnique.mockResolvedValueOnce(click);
    mockPrisma.cashbackTransaction.create.mockResolvedValueOnce({
      id: "cb_1",
      userId: "user_link_owner",
      amountQc: 5,
    });
    mockPrisma.affiliateClick.update.mockResolvedValueOnce({});

    const result = await AffiliateService.createCashback("click_1", 100);

    expect(mockPrisma.cashbackTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user_link_owner",
        amountQc: 5, // floor(100 * 0.05) = 5
        purchaseAmount: 100,
      }),
    });
    expect(result).toMatchObject({ id: "cb_1" });
  });

  it("throws when click is not found", async () => {
    mockPrisma.affiliateClick.findUnique.mockResolvedValueOnce(null);

    await expect(AffiliateService.createCashback("invalid_click", 100)).rejects.toThrow(
      "Click not found",
    );
  });
});

// ── AffiliateService.claimCashback ───────────────────────────

describe("AffiliateService.claimCashback", () => {
  it("claims cashback and earns QC for the user", async () => {
    const cashbackTx = {
      id: "cb_1",
      userId: "user_1",
      amountQc: 5,
      claimedAt: null,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      affiliateClickId: "click_1",
    };

    mockPrisma.cashbackTransaction.findFirst.mockResolvedValueOnce(cashbackTx);
    mockPrisma.cashbackTransaction.update.mockResolvedValueOnce({});
    mockPrisma.affiliateClick.findUnique.mockResolvedValueOnce({
      affiliateLinkId: "link_1",
    });
    mockPrisma.affiliateLink.update.mockResolvedValueOnce({});

    await AffiliateService.claimCashback("cb_1", "user_1");

    expect(mockQc.earn).toHaveBeenCalledWith(
      "user_1",
      5,
      "cashback_claimed",
      "cashback:cb_1",
      { referenceId: "cb_1", referenceType: "cashback" },
    );
    expect(mockPrisma.cashbackTransaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "cb_1" },
        data: expect.objectContaining({ claimedAt: expect.any(Date) }),
      }),
    );
  });

  it("throws when cashback is not found or already claimed", async () => {
    mockPrisma.cashbackTransaction.findFirst.mockResolvedValueOnce(null);

    await expect(AffiliateService.claimCashback("cb_missing", "user_1")).rejects.toThrow(
      "Cashback not found or already claimed",
    );
  });

  it("throws when cashback is expired", async () => {
    mockPrisma.cashbackTransaction.findFirst.mockResolvedValueOnce({
      id: "cb_expired",
      userId: "user_1",
      amountQc: 5,
      claimedAt: null,
      expiresAt: new Date(Date.now() - 1000), // expired
      affiliateClickId: null,
    });

    await expect(AffiliateService.claimCashback("cb_expired", "user_1")).rejects.toThrow(
      "Cashback expired",
    );
  });
});
