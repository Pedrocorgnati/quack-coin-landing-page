// app/(dashboard)/staking/page.tsx
// Staking dashboard — Server Component. Shows position, action form, and history.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth/getSession";
import { QcService } from "@/lib/services/qc.service";
import { StakingService } from "@/lib/services/staking.service";
import { StakingPositionCard } from "@/components/staking/StakingPositionCard";
import { StakeActionForm } from "@/components/staking/StakeActionForm";
import { StakingHistoryTable } from "@/components/staking/StakingHistoryTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History } from "lucide-react";

export const metadata: Metadata = {
  title: "Staking | QuackCoin",
  description: "Stake your QC to earn daily rewards based on your APY.",
};

export const dynamic = "force-dynamic";

export default async function StakingPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login");

  const [detail, availableBalance] = await Promise.all([
    StakingService.getPosition(session.user.id),
    QcService.getBalance(session.user.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Staking</h2>
        <p className="text-sm text-muted-foreground">
          Lock your QC to earn daily rewards. The longer you stake, the more you earn.
        </p>
      </div>

      {/* Position overview */}
      <StakingPositionCard
        stakedAmount={detail.stakedAmount}
        estimatedDailyReward={detail.estimatedDailyReward}
        estimatedAPY={detail.estimatedAPY}
        lastRewardAt={detail.lastRewardAt}
      />

      {/* Stake / Unstake form */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Manage Stake</CardTitle>
        </CardHeader>
        <CardContent>
          <StakeActionForm
            availableBalance={availableBalance}
            currentStake={detail.stakedAmount}
            estimatedAPY={detail.estimatedAPY}
          />
        </CardContent>
      </Card>

      {/* History */}
      {detail.history.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Staking History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StakingHistoryTable history={detail.history} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
