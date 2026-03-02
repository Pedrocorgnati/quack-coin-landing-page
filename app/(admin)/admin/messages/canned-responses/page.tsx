// app/(admin)/admin/messages/canned-responses/page.tsx
// Admin — manage canned responses (CRUD table).

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface CannedResponse {
  id: string;
  title: string;
  body: string;
  shortcode: string;
  isActive: boolean;
}

export default function CannedResponsesPage() {
  const [responses, setResponses] = useState<CannedResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", shortcode: "/" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchResponses() {
    setLoading(true);
    const r = await fetch("/api/admin/canned-responses");
    const data = (await r.json()) as CannedResponse[];
    setResponses(data);
    setLoading(false);
  }

  useEffect(() => {
    void fetchResponses();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/canned-responses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const d = (await res.json()) as { error?: string };
      setError(d.error ?? "Failed");
    } else {
      setForm({ title: "", body: "", shortcode: "/" });
      setShowForm(false);
      await fetchResponses();
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    await fetch(`/api/admin/canned-responses/${id}`, { method: "DELETE" });
    await fetchResponses();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Canned Responses</h2>
          <Link href="/admin/messages" className="text-sm text-muted-foreground hover:underline">
            ← Back to messages
          </Link>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {showForm ? "Cancel" : "New Response"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={(e) => void handleCreate(e)} className="rounded-lg border p-4 space-y-3 max-w-lg">
          <div className="space-y-1">
            <label className="text-sm font-medium">Shortcode</label>
            <input
              value={form.shortcode}
              onChange={(e) => setForm((f) => ({ ...f, shortcode: e.target.value }))}
              required
              pattern="^\/\w+"
              placeholder="/welcome"
              className="w-full rounded-md border px-3 py-2 text-sm bg-background"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
              className="w-full rounded-md border px-3 py-2 text-sm bg-background"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Body</label>
            <textarea
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              required
              rows={4}
              className="w-full rounded-md border px-3 py-2 text-sm bg-background resize-none"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">Shortcode</th>
                <th className="text-left p-3 font-medium">Title</th>
                <th className="text-left p-3 font-medium">Body preview</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {responses.map((r) => (
                <tr key={r.id} className="hover:bg-muted/30">
                  <td className="p-3 font-mono text-xs">{r.shortcode}</td>
                  <td className="p-3">{r.title}</td>
                  <td className="p-3 text-muted-foreground max-w-xs truncate">{r.body}</td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => void handleDelete(r.id)}
                      className="text-xs text-destructive hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {responses.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-muted-foreground">
                    No canned responses yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
