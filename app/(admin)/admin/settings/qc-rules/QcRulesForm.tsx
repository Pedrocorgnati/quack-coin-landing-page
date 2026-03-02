"use client";

// QcRulesForm.tsx — client form for editing QC earning rates and expiry settings.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { QC_CONFIG_KEYS } from "@/lib/constants";

const schema = z.object({
  login: z.number().int().min(0).max(10000),
  lesson_complete: z.number().int().min(0).max(10000),
  course_complete: z.number().int().min(0).max(100000),
  referral: z.number().int().min(0).max(10000),
  profile_complete: z.number().int().min(0).max(10000),
  daily_streak: z.number().int().min(0).max(10000),
  expiry_enabled: z.boolean(),
  expiry_days: z.number().int().min(1).max(3650),
});

type FormValues = z.infer<typeof schema>;

const RATE_FIELDS: Array<{ name: keyof FormValues & string; label: string; description: string }> = [
  { name: "login", label: "Daily Login", description: "QC earned per daily login" },
  { name: "lesson_complete", label: "Lesson Complete", description: "QC earned per completed lesson" },
  { name: "course_complete", label: "Course Complete", description: "QC earned per completed course" },
  { name: "referral", label: "Referral", description: "QC earned per referred user" },
  { name: "profile_complete", label: "Profile Complete", description: "QC earned once for completing profile" },
  { name: "daily_streak", label: "Daily Streak Bonus", description: "Bonus QC per day of streak" },
];

interface QcRulesFormProps {
  current: Record<string, string>;
}

export function QcRulesForm({ current }: QcRulesFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      login: Number(current[QC_CONFIG_KEYS.login]) || 0,
      lesson_complete: Number(current[QC_CONFIG_KEYS.lesson_complete]) || 0,
      course_complete: Number(current[QC_CONFIG_KEYS.course_complete]) || 0,
      referral: Number(current[QC_CONFIG_KEYS.referral]) || 0,
      profile_complete: Number(current[QC_CONFIG_KEYS.profile_complete]) || 0,
      daily_streak: Number(current[QC_CONFIG_KEYS.daily_streak]) || 0,
      expiry_enabled: current[QC_CONFIG_KEYS.expiry_enabled] === "true",
      expiry_days: Number(current[QC_CONFIG_KEYS.expiry_days]) || 365,
    },
  });

  const onSubmit = async (values: FormValues) => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const payload: Record<string, string> = {
        [QC_CONFIG_KEYS.login]: String(values.login),
        [QC_CONFIG_KEYS.lesson_complete]: String(values.lesson_complete),
        [QC_CONFIG_KEYS.course_complete]: String(values.course_complete),
        [QC_CONFIG_KEYS.referral]: String(values.referral),
        [QC_CONFIG_KEYS.profile_complete]: String(values.profile_complete),
        [QC_CONFIG_KEYS.daily_streak]: String(values.daily_streak),
        [QC_CONFIG_KEYS.expiry_enabled]: String(values.expiry_enabled),
        [QC_CONFIG_KEYS.expiry_days]: String(values.expiry_days),
      };
      const res = await fetch("/api/admin/site-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save");
      setSaved(true);
      router.refresh();
    } catch {
      setError("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const expiryEnabled = form.watch("expiry_enabled");

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      {/* Earn Rates */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold">Earn Rates (QC)</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {RATE_FIELDS.map(({ name, label, description }) => (
            <div key={name} className="space-y-1">
              <Label htmlFor={name}>{label}</Label>
              <Input
                id={name}
                type="number"
                min={0}
                max={100000}
                {...form.register(name as keyof FormValues, { valueAsNumber: true })}
                className="w-full"
              />
              {form.formState.errors[name as keyof FormValues] && (
                <p className="text-xs text-red-500">
                  {form.formState.errors[name as keyof FormValues]?.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Expiry Settings */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold">QC Expiry</h2>
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="text-sm font-medium">Enable QC Expiry</p>
            <p className="text-xs text-muted-foreground">
              EARN transactions older than the configured days won&apos;t count
              toward balance.
            </p>
          </div>
          <Switch
            checked={expiryEnabled}
            onCheckedChange={(v) => form.setValue("expiry_enabled", v)}
            aria-label="Enable QC Expiry"
          />
        </div>

        {expiryEnabled && (
          <div className="space-y-1">
            <Label htmlFor="expiry_days">Expiry Window (days)</Label>
            <Input
              id="expiry_days"
              type="number"
              min={1}
              max={3650}
              {...form.register("expiry_days", { valueAsNumber: true })}
              className="w-40"
            />
            {form.formState.errors.expiry_days && (
              <p className="text-xs text-red-500">
                {form.formState.errors.expiry_days.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              EARN transactions older than this many days are excluded from balance.
            </p>
          </div>
        )}
      </section>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save Changes"}
        </Button>
        {saved && <span className="text-sm text-green-600">Saved!</span>}
        {error && <span className="text-sm text-red-500">{error}</span>}
      </div>
    </form>
  );
}
