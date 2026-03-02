// lib/email/cashbackConfirmed.template.tsx
// Email template for cashback claimed/approved notification.

import * as React from "react";

interface CashbackConfirmedProps {
  displayName: string;
  amountQc: number;
  purchaseAmount: number;
  linkCode: string;
}

export function CashbackConfirmedEmail({
  displayName,
  amountQc,
  purchaseAmount,
  linkCode,
}: CashbackConfirmedProps) {
  return (
    <div
      style={{
        fontFamily: "sans-serif",
        maxWidth: "600px",
        margin: "0 auto",
        padding: "24px",
        color: "#1a1a1a",
      }}
    >
      <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "8px" }}>
        🦆 Your Cashback is Ready!
      </h1>
      <p style={{ color: "#666", marginBottom: "24px" }}>Hi {displayName},</p>

      <p>
        You&apos;ve earned <strong>{amountQc} QuackCoin</strong> as cashback on your
        ${purchaseAmount.toFixed(2)} purchase.
      </p>

      <div
        style={{
          background: "#fefce8",
          border: "1px solid #fde047",
          borderRadius: "8px",
          padding: "16px",
          margin: "24px 0",
        }}
      >
        <p style={{ margin: 0, fontWeight: 600 }}>
          🪙 {amountQc} QC added to your balance
        </p>
        <p style={{ margin: "8px 0 0", fontSize: "13px", color: "#713f12" }}>
          Via affiliate link <code>{linkCode}</code>
        </p>
      </div>

      <p>
        <a
          href="https://quackcoin.app/affiliate"
          style={{ color: "#3b82f6", textDecoration: "underline" }}
        >
          View your affiliate dashboard →
        </a>
      </p>

      <hr style={{ border: "none", borderTop: "1px solid #eee", margin: "24px 0" }} />
      <p style={{ fontSize: "12px", color: "#999" }}>
        QuackCoin — Your crypto education platform.
      </p>
    </div>
  );
}
