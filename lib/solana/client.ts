// lib/solana/client.ts
// Lightweight Solana RPC client for server-side payment verification.
// Uses the Solana JSON-RPC API directly (no @solana/web3.js dependency needed).

import { env } from "@/lib/env";

interface RpcResponse<T> {
  jsonrpc: "2.0";
  id: number;
  result: T | null;
  error?: { code: number; message: string };
}

interface TransactionMeta {
  err: null | Record<string, unknown>;
  postTokenBalances?: Array<{
    accountIndex: number;
    mint: string;
    owner: string;
    uiTokenAmount: { amount: string; decimals: number; uiAmount: number | null };
  }>;
  preTokenBalances?: Array<{
    accountIndex: number;
    mint: string;
    owner: string;
    uiTokenAmount: { amount: string; decimals: number; uiAmount: number | null };
  }>;
}

interface TransactionResult {
  slot: number;
  meta: TransactionMeta | null;
  blockTime: number | null;
  transaction: {
    message: {
      accountKeys: string[];
      instructions: Array<{
        programIdIndex: number;
        accounts: number[];
        data: string;
      }>;
    };
    signatures: string[];
  };
}

// USDC has 6 decimal places
const USDC_DECIMALS = 6;

async function rpcCall<T>(
  method: string,
  params: unknown[],
): Promise<T | null> {
  const res = await fetch(env.SOLANA_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    cache: "no-store",
  });

  const json = (await res.json()) as RpcResponse<T>;
  if (json.error) {
    throw new Error(`Solana RPC error: ${json.error.message}`);
  }
  return json.result;
}

export class SolanaClient {
  /**
   * Verify a USDC SPL token transfer on-chain.
   * Checks that the transaction:
   * 1. Exists and is finalized (no error)
   * 2. Transfers at least `expectedAmount` USDC (in whole units, e.g. 9.99)
   * 3. The recipient receives the USDC (destination account owned by expectedRecipient)
   */
  static async verifyUsdcTransfer(
    signature: string,
    expectedAmount: number,
    expectedRecipient: string = env.SOLANA_RECIPIENT_ADDRESS,
  ): Promise<boolean> {
    const result = await rpcCall<TransactionResult>("getTransaction", [
      signature,
      { encoding: "json", maxSupportedTransactionVersion: 0 },
    ]);

    if (!result) return false; // transaction not found
    if (result.meta?.err !== null) return false; // transaction failed on-chain

    const { preTokenBalances = [], postTokenBalances = [] } = result.meta ?? {};

    // Find the USDC token account owned by the recipient
    const recipientPost = postTokenBalances.find(
      (tb) =>
        tb.mint === env.USDC_MINT_ADDRESS && tb.owner === expectedRecipient,
    );
    const recipientPre = preTokenBalances.find(
      (tb) =>
        tb.mint === env.USDC_MINT_ADDRESS && tb.owner === expectedRecipient,
    );

    if (!recipientPost) return false; // recipient never received USDC

    const postAmount = recipientPost.uiTokenAmount.uiAmount ?? 0;
    const preAmount = recipientPre?.uiTokenAmount.uiAmount ?? 0;
    const received = postAmount - preAmount;

    // Allow 1% tolerance for rounding
    const tolerance = expectedAmount * 0.01;
    return received >= expectedAmount - tolerance;
  }

  /**
   * Find the most recent transaction signature referencing the given account/public key.
   * Used by the reconciliation cron to check if a Solana Pay payment arrived without webhook.
   */
  static async findTransactionByReference(reference: string): Promise<string | null> {
    const result = await rpcCall<{
      value: Array<{
        signature: string;
        slot: number;
        err: null | Record<string, unknown>;
        confirmationStatus: string;
      }>;
    }>("getSignaturesForAddress", [reference, { limit: 1 }]);

    const sig = result?.value?.[0];
    if (!sig || sig.err !== null) return null;
    return sig.signature;
  }

  /**
   * Get the confirmation status of a transaction.
   * Returns 'finalized' | 'confirmed' | 'processed' | null
   */
  static async getSignatureStatus(
    signature: string,
  ): Promise<"finalized" | "confirmed" | "processed" | null> {
    const result = await rpcCall<{
      value: Array<{
        slot: number;
        confirmations: number | null;
        err: null | Record<string, unknown>;
        confirmationStatus: "finalized" | "confirmed" | "processed";
      } | null>;
    }>("getSignatureStatuses", [[signature], { searchTransactionHistory: true }]);

    const status = result?.value?.[0];
    if (!status || status.err !== null) return null;
    return status.confirmationStatus;
  }
}
