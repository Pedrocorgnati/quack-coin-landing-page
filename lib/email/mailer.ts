// lib/email/mailer.ts
// Resend client singleton for transactional email delivery.

import { Resend } from "resend";
import { env } from "@/lib/env";

// Singleton Resend client
export const resend = new Resend(env.RESEND_API_KEY);

export const FROM_ADDRESS = "QuackCoin <noreply@quackcoin.app>";
