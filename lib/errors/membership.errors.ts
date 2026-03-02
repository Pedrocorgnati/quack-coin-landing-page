// lib/errors/membership.errors.ts
// Domain errors for the USDC/Membership subsystem.

import { AppError } from "@/lib/errors/app.errors";

export class PaymentNotFoundError extends AppError {
  readonly statusCode = 404;
  readonly code = "PAYMENT_NOT_FOUND";

  constructor(paymentId: string) {
    super(`Payment session not found: ${paymentId}`);
  }
}

export class PaymentAlreadyProcessedError extends AppError {
  readonly statusCode = 409;
  readonly code = "PAYMENT_ALREADY_PROCESSED";

  constructor(paymentId: string) {
    super(`Payment ${paymentId} has already been processed`);
  }
}

export class InvalidTierError extends AppError {
  readonly statusCode = 400;
  readonly code = "INVALID_TIER";

  constructor(tier: string) {
    super(`Invalid membership tier: ${tier}`);
  }
}

export class OnChainVerificationError extends AppError {
  readonly statusCode = 422;
  readonly code = "ON_CHAIN_VERIFICATION_FAILED";

  constructor(signature: string) {
    super(`On-chain verification failed for transaction: ${signature}`);
  }
}
