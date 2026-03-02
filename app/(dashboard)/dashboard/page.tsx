// app/(dashboard)/dashboard/page.tsx
// Dashboard overview — Server Component. Shows QC balance, membership tier, and key metric widgets.

import type { Metadata } from "next";
import { Coins, ArrowLeftRight, TrendingUp, BookOpen, Award, Medal } from "lucide-react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthSession } from "@/lib/auth/getSession";
import { prisma } from "@/lib/prisma";
import { QcService } from "@/lib/services/qc.service";
import { MembershipService } from "@/lib/services/membership.service";
import { StakingService } from "@/lib/services/staking.service";
import { BadgeService } from "@/lib/services/badge.service";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { QCBalanceLive } from "@/components/qc/QCBalanceLive";
import { MembershipStatusCard } from "@/components/membership/MembershipStatusCard";
import { StakingWidget } from "@/components/staking/StakingWidget";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardOverviewPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login");

  const [user, qcBalance, txCount, benefits, stakingDetail, enrolledCourses, badgesEarned] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          membershipTier: true,
          membershipExpiresAt: true,
        },
      }),
      QcService.getBalance(session.user.id),
      prisma.quackCoinTransaction.count({ where: { userId: session.user.id } }),
      MembershipService.getActiveBenefits(session.user.id),
      StakingService.getPosition(session.user.id),
      prisma.courseEnrollment.findMany({
        where: { userId: session.user.id },
        orderBy: { enrolledAt: "desc" },
        take: 4,
        include: {
          course: {
            select: { id: true, title: true, slug: true },
          },
        },
      }),
      prisma.userBadge.count({ where: { userId: session.user.id } }),
    ]);

  // Fetch progress for enrolled courses
  const courseIds = enrolledCourses.map((e) => e.courseId);
  const [progressList, certificates] = await Promise.all([
    prisma.courseProgress.findMany({
      where: { userId: session.user.id, courseId: { in: courseIds } },
      select: { courseId: true, percentComplete: true },
    }),
    prisma.certificate.findMany({
      where: { userId: session.user.id, courseId: { in: courseIds } },
      select: { courseId: true, id: true },
    }),
  ]);
  const progressMap = Object.fromEntries(progressList.map((p) => [p.courseId, p.percentComplete]));
  const certMap = Object.fromEntries(certificates.map((c) => [c.courseId, c.id]));
  const enrollmentCount = enrolledCourses.length;

  if (!user) redirect("/login");

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground text-sm">
          Welcome back! Here&apos;s your QuackCoin overview.
        </p>
      </div>

      {/* Hero row: balance + membership widget */}
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex flex-col gap-1">
          <QCBalanceLive initialBalance={qcBalance} variant="full" className="w-52" />
          <Link
            href="/qc"
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            View QC Economy →
          </Link>
        </div>
        <MembershipStatusCard
          tier={user.membershipTier}
          expiresAt={user.membershipExpiresAt}
          qcMultiplier={benefits.qcMultiplier}
          stakingBonus={benefits.stakingBonus}
          cashbackBonus={benefits.cashbackBonus}
          className="w-56"
        />
      </div>

      {/* Metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="QC Balance"
          value={qcBalance.toLocaleString("en-US")}
          icon={Coins}
        />
        <MetricCard
          title="Transactions"
          value={txCount}
          icon={ArrowLeftRight}
        />
        <MetricCard
          title="Staked QC"
          value={stakingDetail.stakedAmount.toLocaleString("en-US")}
          icon={TrendingUp}
        />
        <MetricCard
          title="Courses Enrolled"
          value={enrollmentCount}
          icon={BookOpen}
        />
        <Link href="/badges">
          <MetricCard
            title="Badges Earned"
            value={badgesEarned}
            icon={Medal}
          />
        </Link>
      </div>

      {/* Staking summary widget */}
      {stakingDetail.stakedAmount > 0 && (
        <StakingWidget
          stakedAmount={stakingDetail.stakedAmount}
          estimatedDailyReward={stakingDetail.estimatedDailyReward}
        />
      )}

      {/* Your Courses */}
      {enrolledCourses.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">Your Courses</h3>
            <Link
              href="/courses"
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              Browse catalog →
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {enrolledCourses.map((enrollment) => {
              const percent = progressMap[enrollment.courseId] ?? 0;
              const certId = certMap[enrollment.courseId];
              return (
                <Link
                  key={enrollment.id}
                  href={`/courses/${enrollment.course.slug}`}
                  className="flex flex-col gap-2 rounded-lg border bg-card p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-snug line-clamp-2">
                      {enrollment.course.title}
                    </p>
                    {certId && (
                      <Award
                        className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5"
                        aria-label="Certificate earned"
                      />
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${percent}%` }}
                        aria-label={`${Math.round(percent)}% complete`}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {Math.round(percent)}% complete
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
