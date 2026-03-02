// app/(admin)/raffles/new/page.tsx
// Admin — create a new raffle form.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewRafflePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const fd = new FormData(e.currentTarget);

    const body = {
      title: fd.get("title") as string,
      description: fd.get("description") as string,
      prizeDescription: fd.get("prizeDescription") as string,
      ticketPriceQc: Number(fd.get("ticketPriceQc")),
      maxTickets: fd.get("maxTickets") ? Number(fd.get("maxTickets")) : undefined,
      drawAt: new Date(fd.get("drawAt") as string).toISOString(),
    };

    try {
      const res = await fetch("/api/admin/raffles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string }).error ?? `HTTP ${res.status}`,
        );
      }

      router.push("/admin/raffles");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">New Raffle</h2>
        <Link href="/admin/raffles" className="text-sm text-muted-foreground hover:underline">
          ← Back
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Title" name="title" required minLength={3} maxLength={120} />
        <Field
          label="Description"
          name="description"
          required
          minLength={10}
          maxLength={2000}
          multiline
        />
        <Field
          label="Prize description"
          name="prizeDescription"
          required
          minLength={3}
          maxLength={500}
        />
        <Field
          label="Ticket price (QC)"
          name="ticketPriceQc"
          type="number"
          required
          min={1}
        />
        <Field
          label="Max tickets (leave blank for unlimited)"
          name="maxTickets"
          type="number"
          min={1}
        />
        <Field
          label="Draw at"
          name="drawAt"
          type="datetime-local"
          required
        />

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "Creating…" : "Create Raffle"}
        </button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tiny field helper
// ---------------------------------------------------------------------------

interface FieldProps {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  min?: number;
  minLength?: number;
  maxLength?: number;
  multiline?: boolean;
}

function Field({ label, name, type = "text", required, min, minLength, maxLength, multiline }: FieldProps) {
  const cls =
    "w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";
  return (
    <div className="space-y-1">
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
      </label>
      {multiline ? (
        <textarea
          id={name}
          name={name}
          required={required}
          minLength={minLength}
          maxLength={maxLength}
          rows={4}
          className={cls}
        />
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          required={required}
          min={min}
          minLength={minLength}
          maxLength={maxLength}
          className={cls}
        />
      )}
    </div>
  );
}
