// tests/unit/staking.service.test.ts
// Unit tests for StakingService using mocked Prisma, QcService, MembershipService, SiteConfigService.

import { StakingService } from "@/lib/services/staking.service";
import { StakingStatus, StakingEventType } from "@/lib/generated/prisma/client";
import { InsufficientStakeError, NoActiveStakeError } from "@/lib/errors/staking.errors";

// ── Mock Prisma ───────────────────────────────────────────────

const mockTxClient = {
  stakingPosition: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  stakingHistory: {
    create: jest.fn(),
  },
};

jest.mock("@/lib/prisma", () => ({
  prisma: {
    stakingPosition: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    stakingHistory: {
      create: jest.fn(),
    },
    $transaction: jest.fn((fn: (tx: unknown) => Promise<unknown>) => fn(mockTxClient)),
  },
}));

// ── Mock QcService ────────────────────────────────────────────

jest.mock("@/lib/services/qc.service", () => ({
  QcService: {
    deduct: jest.fn().mockResolvedValue({ id: "tx_1", amount: 100 }),
    earn: jest.fn().mockResolvedValue({ id: "tx_2", amount: 100 }),
    getBalance: jest.fn().mockResolvedValue(900),
  },
}));

// ── Mock MembershipService ────────────────────────────────────

jest.mock("@/lib/services/membership.service", () => ({
  MembershipService: {
    getActiveBenefits: jest.fn().mockResolvedValue({
      qcMultiplier: 1.0,
      stakingBonus: 0,
      cashbackBonus: 0,
    }),
  },
}));

// ── Mock SiteConfigService ────────────────────────────────────

jest.mock("@/lib/services/siteConfig.service", () => ({
  SiteConfigService: {
    getOrDefault: jest.fn().mockResolvedValue("0.08"),
  },
}));

import { prisma } from "@/lib/prisma";
import { QcService } from "@/lib/services/qc.service";
import { MembershipService } from "@/lib/services/membership.service";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPrisma = prisma as jest.Mocked<any>;
const mockQc = QcService as jest.Mocked<typeof QcService>;
const mockMembership = MembershipService as jest.Mocked<typeof MembershipService>;

beforeEach(() => {
  jest.clearAllMocks();
  // Default resolved values for tx client
  mockTxClient.stakingPosition.findFirst.mockResolvedValue(null);
  mockTxClient.stakingPosition.create.mockResolvedValue({
    id: "pos_1",
    userId: "user_1",
    amountQc: 100,
    apy: 0.08,
    status: StakingStatus.ACTIVE,
    stakedAt: new Date(),
    lastRewardAt: new Date(),
  });
  mockTxClient.stakingPosition.update.mockResolvedValue({
    id: "pos_1",
    userId: "user_1",
    amountQc: 100,
    apy: 0.08,
    status: StakingStatus.ACTIVE,
    stakedAt: new Date(),
    lastRewardAt: new Date(),
  });
  mockTxClient.stakingHistory.create.mockResolvedValue({});
});

// ─────────────────────────────────────────────────────────────────

describe("StakingService.deposit", () => {
  it("deducts QC from balance and creates staking position", async () => {
    mockTxClient.stakingPosition.findFirst.mockResolvedValue(null); // no existing position
    mockQc.getBalance.mockResolvedValue(900);

    const result = await StakingService.deposit("user_1", 100);

    expect(mockQc.deduct).toHaveBeenCalledWith(
      "user_1",
      100,
      "Staking deposit",
      expect.any(String),
    );
    expect(mockTxClient.stakingPosition.create).toHaveBeenCalled();
    expect(result.stakedAmount).toBe(100);
    expect(result.newBalance).toBe(900);
    expect(result.estimatedDailyReward).toBeGreaterThanOrEqual(0);
  });

  it("increases existing position on second deposit", async () => {
    mockTxClient.stakingPosition.findFirst.mockResolvedValue({
      id: "pos_1",
      userId: "user_1",
      amountQc: 100,
      apy: 0.08,
      status: StakingStatus.ACTIVE,
    });
    mockTxClient.stakingPosition.update.mockResolvedValue({
      id: "pos_1",
      userId: "user_1",
      amountQc: 200,
      apy: 0.08,
      status: StakingStatus.ACTIVE,
      stakedAt: new Date(),
      lastRewardAt: new Date(),
    });

    const result = await StakingService.deposit("user_1", 100);

    expect(mockTxClient.stakingPosition.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "pos_1" },
        data: expect.objectContaining({ amountQc: { increment: 100 } }),
      }),
    );
    expect(result.stakedAmount).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────

describe("StakingService.withdraw", () => {
  const BASE_POSITION = {
    id: "pos_1",
    userId: "user_1",
    amountQc: 200,
    apy: 0.08,
    status: StakingStatus.ACTIVE,
    stakedAt: new Date(),
    lastRewardAt: new Date(),
  };

  it("returns QC to balance and records WITHDRAWAL history", async () => {
    mockPrisma.stakingPosition.findFirst.mockResolvedValue(BASE_POSITION);
    mockTxClient.stakingPosition.update.mockResolvedValue({
      ...BASE_POSITION,
      amountQc: 150,
    });
    mockQc.getBalance.mockResolvedValue(1050);

    const result = await StakingService.withdraw("user_1", 50);

    expect(mockQc.earn).toHaveBeenCalledWith(
      "user_1",
      50,
      "Staking withdrawal",
      expect.any(String),
    );
    expect(result.stakedAmount).toBe(150);
    expect(result.newBalance).toBe(1050);
  });

  it("throws NoActiveStakeError when no position exists", async () => {
    mockPrisma.stakingPosition.findFirst.mockResolvedValue(null);

    await expect(StakingService.withdraw("user_1", 50)).rejects.toBeInstanceOf(NoActiveStakeError);
  });

  it("throws InsufficientStakeError when withdrawing more than staked", async () => {
    mockPrisma.stakingPosition.findFirst.mockResolvedValue({
      ...BASE_POSITION,
      amountQc: 30,
    });

    await expect(StakingService.withdraw("user_1", 100)).rejects.toBeInstanceOf(
      InsufficientStakeError,
    );
  });
});

// ─────────────────────────────────────────────────────────────────

describe("StakingService.calculateReward", () => {
  it("returns 0 if last reward was less than 1 day ago", async () => {
    const position = {
      id: "pos_1",
      userId: "user_1",
      amountQc: 1000,
      apy: 0.08,
      status: StakingStatus.ACTIVE,
      stakedAt: new Date(),
      lastRewardAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
    };

    const reward = await StakingService.calculateReward(position as never);
    expect(reward).toBe(0);
  });

  it("calculates reward proportional to APY and staked amount", async () => {
    const lastRewardAt = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
    const position = {
      id: "pos_1",
      userId: "user_1",
      amountQc: 36500, // 36500 × 0.08 / 365 = 8 QC per day
      apy: 0.08,
      status: StakingStatus.ACTIVE,
      stakedAt: lastRewardAt,
      lastRewardAt,
    };

    const reward = await StakingService.calculateReward(position as never);
    expect(reward).toBe(8); // 36500 * 0.08 / 365 ≈ 8
  });

  it("adds membership staking bonus to APY", async () => {
    const lastRewardAt = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const position = {
      id: "pos_1",
      userId: "user_1",
      amountQc: 36500,
      apy: 0.08,
      status: StakingStatus.ACTIVE,
      stakedAt: lastRewardAt,
      lastRewardAt,
    };

    // Simulate membership with 5% staking bonus
    mockMembership.getActiveBenefits.mockResolvedValueOnce({
      qcMultiplier: 1.0,
      stakingBonus: 5,
      cashbackBonus: 0,
    });

    const reward = await StakingService.calculateReward(position as never);
    // 36500 * (0.08 + 0.05) / 365 ≈ 13
    expect(reward).toBe(13);
  });
});
