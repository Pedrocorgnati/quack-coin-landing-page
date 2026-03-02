"use client";

import { useState } from "react";
import {
  QCBalanceCard,
  MembershipTierBadge,
  SolanaPayQR,
  NotificationBell,
  DataTable,
  EmptyState,
  ConfirmDialog,
  LoadingSpinner,
} from "@/components/shared";
import type { ColumnDef } from "@tanstack/react-table";
import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";

const DEMO_PAYMENT_URL =
  "solana:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v?amount=9.99&label=Silver+Membership&message=QuackCoin";

const columns: ColumnDef<{ name: string; amount: number }>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "amount", header: "Amount" },
];

const demoData = [
  { name: "Login reward", amount: 10 },
  { name: "Course complete", amount: 50 },
];

export function ComponentTestClient() {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const expiresAt = new Date(Date.now() + 12 * 60 * 1000); // 12 min from now

  return (
    <div className="mx-auto max-w-4xl space-y-10 p-8">
      <h1 className="text-2xl font-bold">Shared Component Smoke Test</h1>

      {/* QCBalanceCard */}
      <section className="space-y-3">
        <h2 className="font-semibold">QCBalanceCard</h2>
        <div className="flex flex-wrap gap-4">
          <QCBalanceCard balance={1500} variant="compact" />
          <QCBalanceCard balance={0} loading variant="compact" />
          <QCBalanceCard balance={12345} variant="full" lastTransactionLabel="+50 QC — course complete" />
          <QCBalanceCard balance={0} loading variant="full" />
        </div>
      </section>

      {/* MembershipTierBadge */}
      <section className="space-y-3">
        <h2 className="font-semibold">MembershipTierBadge</h2>
        <div className="flex flex-wrap gap-4">
          <MembershipTierBadge tier="FREE" />
          <MembershipTierBadge tier="SILVER" />
          <MembershipTierBadge tier="GOLD" />
          <MembershipTierBadge tier="PLATINUM" />
          <MembershipTierBadge tier="GOLD" expiresAt={new Date(Date.now() + 2 * 86400_000)} />
        </div>
      </section>

      {/* SolanaPayQR */}
      <section className="space-y-3">
        <h2 className="font-semibold">SolanaPayQR</h2>
        <SolanaPayQR
          paymentUrl={DEMO_PAYMENT_URL}
          amount={9.99}
          label="Silver Membership"
          expiresAt={expiresAt}
        />
      </section>

      {/* NotificationBell */}
      <section className="space-y-3">
        <h2 className="font-semibold">NotificationBell</h2>
        <NotificationBell userId="demo_user" />
      </section>

      {/* DataTable */}
      <section className="space-y-3">
        <h2 className="font-semibold">DataTable</h2>
        <DataTable columns={columns} data={demoData} />
        <DataTable columns={columns} data={[]} />
        <DataTable columns={columns} data={[]} isLoading />
      </section>

      {/* EmptyState */}
      <section className="space-y-3">
        <h2 className="font-semibold">EmptyState</h2>
        <EmptyState
          icon={Inbox}
          title="No transactions yet"
          description="Your QuackCoin transactions will appear here."
          action={{ label: "Explore courses", onClick: () => {} }}
        />
      </section>

      {/* ConfirmDialog */}
      <section className="space-y-3">
        <h2 className="font-semibold">ConfirmDialog</h2>
        <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
          Open destructive confirm
        </Button>
        <ConfirmDialog
          open={confirmOpen}
          title="Ban this user?"
          description="This action cannot be undone. The user will lose access immediately."
          destructive
          confirmLabel="Yes, ban user"
          onConfirm={() => setConfirmOpen(false)}
          onCancel={() => setConfirmOpen(false)}
        />
      </section>

      {/* LoadingSpinner */}
      <section className="space-y-3">
        <h2 className="font-semibold">LoadingSpinner</h2>
        <LoadingSpinner size={32} />
      </section>
    </div>
  );
}
