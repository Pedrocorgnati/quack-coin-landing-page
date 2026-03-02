// lib/utils/loginStreak.ts
// Compute consecutive login days for a user from QuackCoinTransaction records
// where referenceType = "login".

import { prisma } from "@/lib/prisma";
import { TransactionType } from "@/lib/generated/prisma/client";

/**
 * Returns the number of consecutive days (ending today) that the user has
 * logged in. Each unique calendar day with at least one EARN login transaction
 * counts as one login day.
 *
 * Algorithm: look at all login transactions for the user ordered newest-first.
 * Walk backwards from today; if there is a transaction on day D the streak
 * continues, otherwise it breaks.
 */
export async function getLoginStreak(userId: string): Promise<number> {
  const loginTxs = await prisma.quackCoinTransaction.findMany({
    where: {
      userId,
      type: TransactionType.EARN,
      referenceType: "login",
    },
    select: { createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  if (loginTxs.length === 0) return 0;

  // Collect unique calendar dates (UTC) as "YYYY-MM-DD" strings
  const days = new Set(loginTxs.map((tx) => tx.createdAt.toISOString().slice(0, 10)));

  const today = new Date().toISOString().slice(0, 10);
  let streak = 0;

  // Walk backwards from today
  const cursor = new Date();
  while (true) {
    const dateStr = cursor.toISOString().slice(0, 10);
    if (days.has(dateStr)) {
      streak++;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    } else {
      // Allow today to be missing (user just logged in, transaction may not yet exist)
      if (dateStr === today && streak === 0) {
        cursor.setUTCDate(cursor.getUTCDate() - 1);
        continue;
      }
      break;
    }
  }

  return streak;
}
