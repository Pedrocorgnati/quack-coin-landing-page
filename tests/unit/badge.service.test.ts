// tests/unit/badge.service.test.ts
import { BadgeService } from "@/lib/services/badge.service";
import { BadgeCategory, NotificationType } from "@/lib/generated/prisma/client";

// ── Mocks ──────────────────────────────────────────────────────────
jest.mock("@/lib/prisma", () => ({
  prisma: {
    userBadge: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    badge: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("@/lib/services/notification.service", () => ({
  NotificationService: {
    send: jest.fn().mockResolvedValue(undefined),
  },
}));

import { prisma } from "@/lib/prisma";
import { NotificationService } from "@/lib/services/notification.service";

const mockPrisma = prisma as unknown as {
  userBadge: {
    findMany: jest.Mock;
    create: jest.Mock;
  };
  badge: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
  };
};

const MOCK_BADGE_7DAY = {
  id: "badge-7day",
  slug: "login-streak-7",
  name: "7-Day Streak",
  description: "Log in for 7 consecutive days.",
  imageUrl: "/badges/placeholder.png",
  category: BadgeCategory.LOYALTY,
  qcThreshold: null,
  isActive: true,
  createdAt: new Date(),
};

const MOCK_BADGE_QC500 = {
  id: "badge-qc500",
  slug: "qc-hoarder-500",
  name: "QC Hoarder",
  description: "Accumulate 500 QC in your wallet.",
  imageUrl: "/badges/placeholder.png",
  category: BadgeCategory.LOYALTY,
  qcThreshold: 500,
  isActive: true,
  createdAt: new Date(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("BadgeService.check — login streak badges", () => {
  it("unlocks 7-Day Streak after 7 consecutive login days", async () => {
    mockPrisma.userBadge.findMany.mockResolvedValue([]);
    mockPrisma.badge.findMany.mockResolvedValue([MOCK_BADGE_7DAY]);
    mockPrisma.badge.findUnique.mockResolvedValue(MOCK_BADGE_7DAY);
    mockPrisma.userBadge.create.mockResolvedValue({ id: "ub1", userId: "u1", badgeId: "badge-7day", earnedAt: new Date() });

    await BadgeService.check({ type: "login", userId: "u1", consecutiveDays: 7 });

    expect(mockPrisma.userBadge.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.userBadge.create).toHaveBeenCalledWith({
      data: { userId: "u1", badgeId: "badge-7day" },
    });
    expect(NotificationService.send).toHaveBeenCalledWith(
      "u1",
      NotificationType.BADGE_EARNED,
      expect.objectContaining({ type: NotificationType.BADGE_EARNED }),
    );
  });

  it("does NOT unlock 7-Day Streak after only 6 consecutive days", async () => {
    mockPrisma.userBadge.findMany.mockResolvedValue([]);
    mockPrisma.badge.findMany.mockResolvedValue([MOCK_BADGE_7DAY]);

    await BadgeService.check({ type: "login", userId: "u1", consecutiveDays: 6 });

    expect(mockPrisma.userBadge.create).not.toHaveBeenCalled();
  });

  it("does NOT re-unlock 7-Day Streak if already earned", async () => {
    mockPrisma.userBadge.findMany.mockResolvedValue([
      { badge: { slug: "login-streak-7" } },
    ]);
    mockPrisma.badge.findMany.mockResolvedValue([MOCK_BADGE_7DAY]);

    await BadgeService.check({ type: "login", userId: "u1", consecutiveDays: 30 });

    expect(mockPrisma.userBadge.create).not.toHaveBeenCalled();
  });
});

describe("BadgeService.check — QC balance thresholds", () => {
  it("unlocks QC Hoarder when balance reaches 500", async () => {
    mockPrisma.userBadge.findMany.mockResolvedValue([]);
    mockPrisma.badge.findMany.mockResolvedValue([MOCK_BADGE_QC500]);
    mockPrisma.badge.findUnique.mockResolvedValue(MOCK_BADGE_QC500);
    mockPrisma.userBadge.create.mockResolvedValue({ id: "ub2", userId: "u2", badgeId: "badge-qc500", earnedAt: new Date() });

    await BadgeService.check({ type: "qc_balance", userId: "u2", balance: 500 });

    expect(mockPrisma.userBadge.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.userBadge.create).toHaveBeenCalledWith({
      data: { userId: "u2", badgeId: "badge-qc500" },
    });
  });

  it("does NOT unlock QC Hoarder when balance is below 500", async () => {
    mockPrisma.userBadge.findMany.mockResolvedValue([]);
    mockPrisma.badge.findMany.mockResolvedValue([MOCK_BADGE_QC500]);

    await BadgeService.check({ type: "qc_balance", userId: "u2", balance: 499 });

    expect(mockPrisma.userBadge.create).not.toHaveBeenCalled();
  });
});

describe("BadgeService.unlock — duplicate prevention", () => {
  it("silently ignores P2002 unique constraint violation (already earned)", async () => {
    mockPrisma.badge.findUnique.mockResolvedValue(MOCK_BADGE_7DAY);

    const p2002Error = Object.assign(new Error("Unique constraint"), { code: "P2002" });
    mockPrisma.userBadge.create.mockRejectedValue(p2002Error);

    await expect(BadgeService.unlock("u1", "login-streak-7")).resolves.toBeUndefined();
    expect(NotificationService.send).not.toHaveBeenCalled();
  });

  it("rethrows non-P2002 errors", async () => {
    mockPrisma.badge.findUnique.mockResolvedValue(MOCK_BADGE_7DAY);
    mockPrisma.userBadge.create.mockRejectedValue(new Error("DB connection lost"));

    await expect(BadgeService.unlock("u1", "login-streak-7")).rejects.toThrow("DB connection lost");
  });
});

describe("BadgeService.getBadgesForUser", () => {
  it("returns all badges with earned=true for earned, false for unearned", async () => {
    const allBadges = [MOCK_BADGE_7DAY, MOCK_BADGE_QC500];
    const earnedAt = new Date();
    mockPrisma.badge.findMany.mockResolvedValue(allBadges);
    mockPrisma.userBadge.findMany.mockResolvedValue([
      { badgeId: "badge-7day", earnedAt },
    ]);

    const result = await BadgeService.getBadgesForUser("u1");

    expect(result).toHaveLength(2);
    const earned = result.find((b) => b.id === "badge-7day");
    const unearned = result.find((b) => b.id === "badge-qc500");
    expect(earned?.earned).toBe(true);
    expect(earned?.earnedAt).toEqual(earnedAt);
    expect(unearned?.earned).toBe(false);
    expect(unearned?.earnedAt).toBeNull();
  });
});
