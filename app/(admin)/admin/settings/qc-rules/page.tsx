// app/(admin)/admin/settings/qc-rules/page.tsx
// Admin page: configure QC earning rates and expiry settings.

import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/requireRole";
import { SiteConfigService } from "@/lib/services/siteConfig.service";
import { QC_CONFIG_KEYS, QC_EARN_DEFAULTS, QC_EXPIRY_DEFAULTS } from "@/lib/constants";
import { QcRulesForm } from "./QcRulesForm";

export const metadata: Metadata = { title: "QC Rules | Admin" };

export default async function QcRulesPage() {
  await requireAdmin();

  const keys = [
    QC_CONFIG_KEYS.login,
    QC_CONFIG_KEYS.lesson_complete,
    QC_CONFIG_KEYS.course_complete,
    QC_CONFIG_KEYS.referral,
    QC_CONFIG_KEYS.profile_complete,
    QC_CONFIG_KEYS.daily_streak,
    QC_CONFIG_KEYS.expiry_enabled,
    QC_CONFIG_KEYS.expiry_days,
  ];

  const values = await SiteConfigService.getMany(keys);

  const defaults = {
    [QC_CONFIG_KEYS.login]: String(QC_EARN_DEFAULTS.login),
    [QC_CONFIG_KEYS.lesson_complete]: String(QC_EARN_DEFAULTS.lesson_complete),
    [QC_CONFIG_KEYS.course_complete]: String(QC_EARN_DEFAULTS.course_complete),
    [QC_CONFIG_KEYS.referral]: String(QC_EARN_DEFAULTS.referral),
    [QC_CONFIG_KEYS.profile_complete]: String(QC_EARN_DEFAULTS.profile_complete),
    [QC_CONFIG_KEYS.daily_streak]: String(QC_EARN_DEFAULTS.daily_streak),
    [QC_CONFIG_KEYS.expiry_enabled]: String(QC_EXPIRY_DEFAULTS.enabled),
    [QC_CONFIG_KEYS.expiry_days]: String(QC_EXPIRY_DEFAULTS.days),
  };

  // Merge config values with defaults
  const current: Record<string, string> = {};
  for (const key of keys) {
    current[key] = values[key] ?? defaults[key] ?? "";
  }

  return (
    <div className="max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">QC Earning Rules</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure how many QuackCoins users earn per activity. Changes apply
          within 60 seconds (Redis TTL).
        </p>
      </div>
      <QcRulesForm current={current} />
    </div>
  );
}
