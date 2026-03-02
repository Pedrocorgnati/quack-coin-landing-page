"use client";

// app/(admin)/admin/settings/site-config/page.tsx
// Admin SiteConfig editor — grouped form for QC rates, membership prices,
// staking APY, cashback rate, and QC expiry settings.

import { useEffect, useState, useCallback } from "react";
import { Save, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ── Types ──────────────────────────────────────────────────────────────────

interface ConfigEntry {
  key: string;
  value: string;
  updatedAt: string;
}

// ── Grouped field definitions ──────────────────────────────────────────────

interface FieldDef {
  key: string;
  label: string;
  type?: "number" | "text" | "toggle";
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}

interface Section {
  title: string;
  fields: FieldDef[];
}

const SECTIONS: Section[] = [
  {
    title: "QC Earn Rates",
    fields: [
      { key: "qc.earn.daily_login",     label: "Daily Login",        type: "number", min: 0, max: 10000, suffix: "QC" },
      { key: "qc.earn.referral",         label: "Referral",           type: "number", min: 0, max: 10000, suffix: "QC" },
      { key: "qc.earn.lesson_complete",  label: "Lesson Complete",    type: "number", min: 0, max: 10000, suffix: "QC" },
      { key: "qc.earn.course_complete",  label: "Course Complete",    type: "number", min: 0, max: 10000, suffix: "QC" },
      { key: "qc.earn.purchase",         label: "Purchase",           type: "number", min: 0, max: 10000, suffix: "QC" },
      { key: "qc.earn.staking_deposit",  label: "Staking Deposit",    type: "number", min: 0, max: 10000, suffix: "QC" },
      { key: "qc.earn.raffle_entry",     label: "Raffle Entry",       type: "number", min: 0, max: 10000, suffix: "QC" },
    ],
  },
  {
    title: "Membership USDC Prices",
    fields: [
      { key: "membership.price.SILVER",   label: "Silver",   type: "number", min: 0, step: 0.01, suffix: "USDC" },
      { key: "membership.price.GOLD",     label: "Gold",     type: "number", min: 0, step: 0.01, suffix: "USDC" },
      { key: "membership.price.PLATINUM", label: "Platinum", type: "number", min: 0, step: 0.01, suffix: "USDC" },
      { key: "membership.price.DIAMOND",  label: "Diamond",  type: "number", min: 0, step: 0.01, suffix: "USDC" },
    ],
  },
  {
    title: "Staking APY",
    fields: [
      { key: "staking.apy.base",     label: "Base APY",     type: "number", min: 0, max: 200, step: 0.1, suffix: "%" },
      { key: "staking.apy.SILVER",   label: "Silver Bonus", type: "number", min: 0, max: 200, step: 0.1, suffix: "%" },
      { key: "staking.apy.GOLD",     label: "Gold Bonus",   type: "number", min: 0, max: 200, step: 0.1, suffix: "%" },
      { key: "staking.apy.PLATINUM", label: "Plat. Bonus",  type: "number", min: 0, max: 200, step: 0.1, suffix: "%" },
    ],
  },
  {
    title: "Cashback",
    fields: [
      { key: "cashback.rate", label: "Cashback Rate", type: "number", min: 0, max: 100, step: 0.1, suffix: "%" },
    ],
  },
  {
    title: "QC Expiry",
    fields: [
      { key: "qc.expiry.enabled", label: "Enable Expiry", type: "toggle" },
      { key: "qc.expiry.days",    label: "Expiry Period",  type: "number", min: 1, max: 3650, suffix: "days" },
    ],
  },
];

// ── Component ──────────────────────────────────────────────────────────────

export default function SiteConfigPage() {
  const [configs, setConfigs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/site-config");
      if (!res.ok) return;
      const json: { configs: ConfigEntry[] } = await res.json();
      const map: Record<string, string> = {};
      json.configs.forEach((c) => { map[c.key] = c.value; });
      setConfigs(map);
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function handleChange(key: string, value: string) {
    setConfigs((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setConfirmOpen(false);
    try {
      const updates = Object.entries(configs).map(([key, value]) => ({ key, value }));
      const res = await fetch("/api/admin/site-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      if (!res.ok) return;
      setLastSaved(new Date());
    } catch {
      // fail silently
    } finally {
      setSaving(false);
    }
  }

  function renderField(field: FieldDef) {
    const value = configs[field.key] ?? "";

    if (field.type === "toggle") {
      const isOn = value === "true";
      return (
        <button
          key={field.key}
          type="button"
          onClick={() => handleChange(field.key, isOn ? "false" : "true")}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isOn ? "bg-primary" : "bg-muted"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
              isOn ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      );
    }

    return (
      <div key={field.key} className="relative">
        <Input
          type="number"
          min={field.min}
          max={field.max}
          step={field.step ?? 1}
          value={value}
          onChange={(e) => handleChange(field.key, e.target.value)}
          className={field.suffix ? "pr-14" : ""}
          disabled={loading}
        />
        {field.suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {field.suffix}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Site Config</h2>
          <p className="text-sm text-muted-foreground">
            Runtime settings — changes take effect immediately after save.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastSaved && (
            <span className="text-xs text-muted-foreground">
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" onClick={() => setConfirmOpen(true)} disabled={loading || saving} className="gap-1.5">
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save All"}
          </Button>
        </div>
      </div>

      {SECTIONS.map((section) => (
        <div key={section.title} className="rounded-xl border bg-card p-5">
          <h3 className="font-semibold mb-4 text-sm uppercase tracking-wide text-muted-foreground">
            {section.title}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {section.fields.map((field) => (
              <div key={field.key} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor={field.key} className="text-sm">
                    {field.label}
                  </Label>
                  {field.type === "toggle" && (
                    <Badge variant="outline" className="text-xs">
                      {configs[field.key] === "true" ? "ON" : "OFF"}
                    </Badge>
                  )}
                </div>
                {field.type === "toggle" ? (
                  <div className="flex items-center gap-2">
                    {renderField(field)}
                    <span className="text-xs text-muted-foreground">
                      {configs[field.key] === "true" ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                ) : (
                  renderField(field)
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Confirm save dialog */}
      <Dialog open={confirmOpen} onOpenChange={(open: boolean) => !open && setConfirmOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save all changes?</DialogTitle>
            <DialogDescription>
              This will update all site configuration values immediately. Redis cache will be invalidated.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Confirm save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
