"use client";

// components/affiliate/AffiliateLinkGenerator.tsx
// Form to generate a new affiliate link with optional target URL and campaign label.

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AffiliateLinkGeneratorProps {
  onCreated: () => void;
}

export function AffiliateLinkGenerator({ onCreated }: AffiliateLinkGeneratorProps) {
  const [targetUrl, setTargetUrl] = useState("");
  const [campaign, setCampaign] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, string> = {};
      if (targetUrl.trim()) body.targetUrl = targetUrl.trim();
      if (campaign.trim()) body.campaign = campaign.trim();

      const res = await fetch("/api/affiliate/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to generate link");
      }
      const data = await res.json();
      setGeneratedUrl(data.shortUrl);
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!generatedUrl) return;
    await navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (generatedUrl) {
    return (
      <div className="space-y-4">
        <p className="text-sm font-medium text-green-600 dark:text-green-400">
          Your affiliate link is ready!
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded border bg-muted px-3 py-2 text-sm font-mono truncate">
            {generatedUrl}
          </code>
          <Button size="sm" variant="outline" onClick={handleCopy}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        <div className="flex justify-center">
          <div className="rounded-lg border bg-white p-3">
            <QRCodeSVG value={generatedUrl} size={160} aria-label="Affiliate link QR code" />
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => {
            setGeneratedUrl(null);
            setTargetUrl("");
            setCampaign("");
          }}
        >
          Generate Another
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="target-url">
          Target URL <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Input
          id="target-url"
          type="url"
          placeholder="https://quackcoin.io/pricing"
          value={targetUrl}
          onChange={(e) => setTargetUrl(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Leave blank to link to the home page.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="campaign">
          Campaign label <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Input
          id="campaign"
          type="text"
          placeholder="twitter-bio"
          maxLength={50}
          value={campaign}
          onChange={(e) => setCampaign(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button onClick={handleGenerate} disabled={loading} className="w-full">
        <Link2 className="h-4 w-4 mr-2" aria-hidden="true" />
        {loading ? "Generating…" : "Generate Link"}
      </Button>
    </div>
  );
}
