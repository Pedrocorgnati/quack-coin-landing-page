// lib/errors/raffle.errors.ts
// Domain errors for the Raffle feature.

import { AppError } from "@/lib/errors/app.errors";

export class RaffleNotActiveError extends AppError {
  readonly statusCode = 400;
  readonly code = "RAFFLE_NOT_ACTIVE";
  constructor(raffleId: string) {
    super(`Raffle ${raffleId} is not accepting entries`);
  }
}

export class MaxTicketsExceededError extends AppError {
  readonly statusCode = 400;
  readonly code = "MAX_TICKETS_EXCEEDED";
  constructor(requested: number, available: number) {
    super(`Cannot purchase ${requested} ticket(s) — only ${available} remaining`);
  }
}

export class RaffleAlreadyDrawnError extends AppError {
  readonly statusCode = 409;
  readonly code = "RAFFLE_ALREADY_DRAWN";
  constructor(raffleId: string) {
    super(`Raffle ${raffleId} has already been drawn`);
  }
}

export class InvalidRaffleTransitionError extends AppError {
  readonly statusCode = 400;
  readonly code = "INVALID_RAFFLE_TRANSITION";
  constructor(from: string, to: string) {
    super(`Invalid raffle state transition: ${from} → ${to}`);
  }
}
