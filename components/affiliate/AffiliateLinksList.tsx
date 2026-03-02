"use client";

// components/affiliate/AffiliateLinksList.tsx
// List of user's affiliate links with click/conversion counts and delete action.

import { useState, useEffect, useCallback } from "react";
import { Copy, Check, Trash2, MousePointerClick, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface LinkItem {
  id: string;
  code: string;
  url: string;
  shortUrl: string;
  totalClicks: number;
  conversionCount: number;
  totalEarned: number;
  isActive: boolean;
  createdAt: string;
}

interface AffiliateLinksListProps {
  refreshKey?: number;
}

export function AffiliateLinksList({ refreshKey = 0 }: AffiliateLinksListProps) {
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchLinks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/affiliate/links");
      if (res.ok) {
        const data = await res.json();
        setLinks(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLinks();
  }, [fetchLinks, refreshKey]);

  async function handleCopy(shortUrl: string, id: string) {
    await navigator.clipboard.writeText(shortUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleDelete(id: string) {
    await fetch(`/api/affiliate/links?id=${id}`, { method: "DELETE" });
    setLinks((prev) => prev.filter((l) => l.id !== id));
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    );
  }

  if (links.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        No affiliate links yet. Generate one above.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {links.map((link) => (
        <div
          key={link.id}
          className={`rounded-lg border p-4 space-y-2 ${!link.isActive ? "opacity-50" : ""}`}
        >
          <div className="flex items-center justify-between gap-2">
            <code className="text-sm font-mono truncate flex-1">{link.shortUrl}</code>
            <div className="flex gap-1 shrink-0">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => handleCopy(link.shortUrl, link.id)}
                aria-label="Copy link"
              >
                {copiedId === link.id ? (
                  <Check className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
              {link.isActive && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(link.id)}
                  aria-label="Delete link"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MousePointerClick className="h-3 w-3" aria-hidden="true" />
              {link.totalClicks} click{link.totalClicks !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" aria-hidden="true" />
              {link.conversionCount} conversion{link.conversionCount !== 1 ? "s" : ""}
            </span>
            {link.totalEarned > 0 && (
              <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                {link.totalEarned} QC earned
              </span>
            )}
            {!link.isActive && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                Inactive
              </Badge>
            )}
          </div>

          <p className="text-xs text-muted-foreground truncate">
            → {link.url}
          </p>
        </div>
      ))}
    </div>
  );
}
