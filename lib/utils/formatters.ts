// lib/utils/formatters.ts
// Shared display formatters for QC amounts, USDC, dates, and addresses.

/**
 * Format a QC balance for display.
 * @example formatQC(1500) → "1,500 QC"
 */
export function formatQC(amount: number): string {
  return `${amount.toLocaleString("en-US")} QC`;
}

/**
 * Format USDC amount from lamports (bigint, 6 decimal places).
 * @example formatUSDC(1_500_000n) → "1.50 USDC"
 */
export function formatUSDC(lamports: bigint): string {
  const amount = Number(lamports) / 1_000_000;
  return `${amount.toFixed(2)} USDC`;
}

/**
 * Format a Date to a human-readable string.
 * @example formatDate(new Date()) → "Feb 28, 2026"
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format a Date as a relative time string.
 * @example formatRelativeTime(date) → "3 days ago" | "in 2 hours"
 */
export function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diffMs = date.getTime() - now;
  const absDiffMs = Math.abs(diffMs);
  const isFuture = diffMs > 0;

  const seconds = Math.floor(absDiffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  let unit: string;
  let value: number;

  if (days >= 1) {
    unit = "day";
    value = days;
  } else if (hours >= 1) {
    unit = "hour";
    value = hours;
  } else if (minutes >= 1) {
    unit = "minute";
    value = minutes;
  } else {
    return isFuture ? "in a moment" : "just now";
  }

  const label = `${value} ${unit}${value !== 1 ? "s" : ""}`;
  return isFuture ? `in ${label}` : `${label} ago`;
}

/**
 * Truncate a Solana (or other blockchain) address for display.
 * @example truncateAddress("So1ana...Long...Address") → "So1ana...ress"
 */
export function truncateAddress(address: string, prefixLen = 6, suffixLen = 4): string {
  if (address.length <= prefixLen + suffixLen) return address;
  return `${address.slice(0, prefixLen)}...${address.slice(-suffixLen)}`;
}

/**
 * Format a percentage (0-1 float) as a display string.
 * @example formatPercent(0.0875) → "8.75%"
 */
export function formatPercent(value: number, decimals = 2): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format a number with compact notation.
 * @example formatCompact(12500) → "12.5K"
 */
export function formatCompact(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}
