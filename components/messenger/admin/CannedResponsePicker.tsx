// components/messenger/admin/CannedResponsePicker.tsx
// Popover with searchable list of canned responses. Inserts selected into parent input.

"use client";

import { useState, useEffect, useRef } from "react";

interface CannedResponse {
  id: string;
  title: string;
  body: string;
  shortcode: string;
}

interface CannedResponsePickerProps {
  onSelect: (body: string) => void;
}

export function CannedResponsePicker({ onSelect }: CannedResponsePickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [responses, setResponses] = useState<CannedResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/admin/canned-responses")
      .then((r) => r.json())
      .then((data: CannedResponse[]) => setResponses(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = responses.filter(
    (r) =>
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.shortcode.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded px-2 py-1 text-xs border hover:bg-muted/50"
      >
        Canned
      </button>

      {open && (
        <div className="absolute bottom-full mb-1 right-0 z-50 w-72 rounded-lg border bg-popover shadow-lg">
          <div className="p-2 border-b">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search responses…"
              className="w-full text-sm bg-transparent outline-none"
            />
          </div>
          <div className="max-h-48 overflow-y-auto divide-y">
            {loading && (
              <p className="p-3 text-xs text-muted-foreground">Loading…</p>
            )}
            {!loading && filtered.length === 0 && (
              <p className="p-3 text-xs text-muted-foreground">No matches.</p>
            )}
            {filtered.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  onSelect(r.body);
                  setOpen(false);
                  setSearch("");
                }}
                className="w-full text-left px-3 py-2 hover:bg-muted/50 text-sm"
              >
                <p className="font-medium text-xs">{r.shortcode}</p>
                <p className="text-muted-foreground truncate">{r.title}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
