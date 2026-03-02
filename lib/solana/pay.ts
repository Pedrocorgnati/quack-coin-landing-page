// lib/solana/pay.ts
// Solana Pay URL builder.
// Spec: https://docs.solanapay.com/spec

import { env } from "@/lib/env";
import { randomUUID } from "crypto";

/** Generate a unique reference string (simplified pubkey-like ID for tracking) */
export function generateReference(): string {
  // In production this would be a random Solana Keypair pubkey
  // For our purposes a UUID encoded as base58-like is sufficient
  return randomUUID().replace(/-/g, "");
}

export interface SolanaPayUrlOptions {
  recipient?: string;
  amount: number;
  splToken?: string;
  label?: string;
  message?: string;
  memo?: string;
  reference?: string;
}

/**
 * Build a Solana Pay URL per the spec.
 * solana:{recipient}?amount={amount}&spl-token={mint}&label={label}&message={msg}&memo={memo}&reference={ref}
 */
export function buildSolanaPayUrl(opts: SolanaPayUrlOptions): string {
  const recipient = opts.recipient ?? env.SOLANA_RECIPIENT_ADDRESS;
  const splToken = opts.splToken ?? env.USDC_MINT_ADDRESS;

  const params = new URLSearchParams();
  params.set("amount", opts.amount.toFixed(6));
  params.set("spl-token", splToken);
  if (opts.label) params.set("label", opts.label);
  if (opts.message) params.set("message", opts.message);
  if (opts.memo) params.set("memo", opts.memo);
  if (opts.reference) params.set("reference", opts.reference);

  return `solana:${recipient}?${params.toString()}`;
}
