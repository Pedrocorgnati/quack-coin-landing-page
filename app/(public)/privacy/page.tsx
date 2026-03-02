// app/(public)/privacy/page.tsx
// Privacy Policy page — linked from footer.

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | QuackCoin",
  description: "QuackCoin Privacy Policy — how we collect, use, and protect your data.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="mb-6 text-3xl font-bold">Privacy Policy</h1>
      <p className="mb-4 text-muted-foreground text-sm">Last updated: 2025-01-01</p>

      <section className="prose prose-neutral dark:prose-invert max-w-none">
        <h2>1. Information We Collect</h2>
        <p>
          We collect information you provide directly (email address, display name) and
          usage data to operate the QuackCoin platform.
        </p>

        <h2>2. How We Use Your Information</h2>
        <p>
          We use your information to provide the service, process membership payments,
          calculate QC balances, and send transactional emails.
        </p>

        <h2>3. Data Sharing</h2>
        <p>
          We do not sell your personal data. We share data with payment processors
          (Solana blockchain) solely to fulfil your transactions.
        </p>

        <h2>4. Data Retention</h2>
        <p>
          Account data is retained while your account is active. You may request deletion
          by contacting support.
        </p>

        <h2>5. Contact</h2>
        <p>
          For privacy inquiries, email{" "}
          <a href="mailto:privacy@quackcoin.io" className="underline">
            privacy@quackcoin.io
          </a>
          .
        </p>
      </section>
    </main>
  );
}
