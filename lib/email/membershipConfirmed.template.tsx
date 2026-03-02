// lib/email/membershipConfirmed.template.tsx
// Email template for membership upgrade confirmation.

import * as React from "react";

interface MembershipConfirmedProps {
  displayName: string;
  tier: string;
  expiresAt: Date;
  txSignature: string;
  qcBonus: number;
}

export function MembershipConfirmedEmail({
  displayName,
  tier,
  expiresAt,
  txSignature,
  qcBonus,
}: MembershipConfirmedProps) {
  const solscanUrl = `https://solscan.io/tx/${txSignature}`;
  const formattedExpiry = expiresAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

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
        🦆 Welcome to QuackCoin {tier}!
      </h1>
      <p style={{ color: "#666", marginBottom: "24px" }}>Hi {displayName},</p>
      <p>
        Your <strong>{tier}</strong> membership is now active and valid
        until <strong>{formattedExpiry}</strong>.
      </p>

      <div
        style={{
          background: "#f5f5f5",
          borderRadius: "8px",
          padding: "16px",
          margin: "24px 0",
        }}
      >
        <h2 style={{ fontSize: "16px", marginBottom: "8px" }}>
          🎁 Welcome bonus
        </h2>
        <p style={{ margin: 0 }}>
          <strong>{qcBonus} QC</strong> have been added to your balance as a
          membership upgrade bonus.
        </p>
      </div>

      <p>
        <a
          href={solscanUrl}
          style={{ color: "#3b82f6", textDecoration: "underline" }}
        >
          View transaction on Solscan →
        </a>
      </p>

      <hr style={{ border: "none", borderTop: "1px solid #eee", margin: "24px 0" }} />
      <p style={{ fontSize: "12px", color: "#999" }}>
        QuackCoin — Your crypto education platform.
      </p>
    </div>
  );
}
