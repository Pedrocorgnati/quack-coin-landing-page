// lib/auth/backupCodes.ts — One-time backup code generation and verification.

import { randomBytes } from "crypto";
import { hash, compare } from "bcryptjs";

const BACKUP_CODE_COUNT = 8;
const BCRYPT_COST = 10;

/** Generate BACKUP_CODE_COUNT plaintext codes formatted as XXXX-XXXX-XXXX. */
export function generateBackupCodes(count = BACKUP_CODE_COUNT): string[] {
  return Array.from({ length: count }, () => {
    const raw = randomBytes(6).toString("hex").toUpperCase();
    return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
  });
}

/** Hash each backup code with bcrypt. Returns parallel array of hashes. */
export async function hashBackupCodes(codes: string[]): Promise<string[]> {
  return Promise.all(codes.map((c) => hash(c.trim().toUpperCase(), BCRYPT_COST)));
}

/**
 * Find and consume a matching backup code.
 * Returns the remaining hashes array if a match was found, or null if no match.
 */
export async function consumeBackupCode(
  input: string,
  hashes: string[],
): Promise<string[] | null> {
  const normalised = input.trim().toUpperCase();
  for (let i = 0; i < hashes.length; i++) {
    const h = hashes[i];
    if (!h) continue;
    const isMatch = await compare(normalised, h);
    if (isMatch) {
      return hashes.filter((_, idx) => idx !== i);
    }
  }
  return null;
}
