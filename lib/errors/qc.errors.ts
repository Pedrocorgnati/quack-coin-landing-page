// lib/errors/qc.errors.ts
// Domain errors for the QuackCoin economy.

import { AppError } from "./app.errors";

export class InsufficientQcError extends AppError {
  readonly statusCode = 402;
  readonly code = "INSUFFICIENT_QC";

  constructor(required: number, available: number) {
    super(`Insufficient QC balance: need ${required}, have ${available}`);
  }
}

export class DuplicateTransactionError extends AppError {
  readonly statusCode = 409;
  readonly code = "DUPLICATE_TRANSACTION";

  constructor(idempotencyKey: string) {
    super(`Transaction already processed: ${idempotencyKey}`);
  }
}
