// app/(public)/terms/page.tsx
// Terms of Service page — linked from footer.

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | QuackCoin",
  description: "QuackCoin Terms of Service — rules governing use of the platform.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="mb-6 text-3xl font-bold">Terms of Service</h1>
      <p className="mb-4 text-muted-foreground text-sm">Last updated: 2025-01-01</p>

      <section className="prose prose-neutral dark:prose-invert max-w-none">
        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing QuackCoin you agree to these Terms of Service. If you do not agree,
          do not use the platform.
        </p>

        <h2>2. Eligibility</h2>
        <p>
          You must be 18 years or older to create an account. Accounts are non-transferable.
        </p>

        <h2>3. QC Economy</h2>
        <p>
          QuackCoin (QC) is a virtual currency with no monetary value outside the platform.
          QC balances are non-refundable and non-transferable to fiat currency.
        </p>

        <h2>4. Memberships and Payments</h2>
        <p>
          Membership payments are processed in USDC on the Solana blockchain. All payments
          are final. Refunds are issued solely at our discretion.
        </p>

        <h2>5. Prohibited Conduct</h2>
        <p>
          You may not abuse the platform, manipulate QC balances, or use the service for
          illegal purposes.
        </p>

        <h2>6. Termination</h2>
        <p>
          We reserve the right to suspend or terminate accounts that violate these terms.
        </p>

        <h2>7. Contact</h2>
        <p>
          For questions, email{" "}
          <a href="mailto:support@quackcoin.io" className="underline">
            support@quackcoin.io
          </a>
          .
        </p>
      </section>
    </main>
  );
}
