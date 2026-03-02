// lib/errors/staking.errors.ts
// Domain errors for the staking subsystem.

import { AppError } from "@/lib/errors/app.errors";

export class InsufficientStakeError extends AppError {
  readonly statusCode = 400;
  readonly code = "INSUFFICIENT_STAKE";

  constructor(requested: number, available: number) {
    super(
      `Cannot withdraw ${requested} QC — only ${available} QC staked`,
    );
  }
}

export class NoActiveStakeError extends AppError {
  readonly statusCode = 400;
  readonly code = "NO_ACTIVE_STAKE";

  constructor(userId: string) {
    super(`User ${userId} has no active staking position`);
  }
}
