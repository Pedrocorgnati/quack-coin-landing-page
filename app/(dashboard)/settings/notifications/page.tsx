// app/(dashboard)/settings/notifications/page.tsx
// Notification preferences page — toggle rows per NotificationType (In-App + Push channels).
// Auto-saves on change with 800ms debounce.

"use client";

import { useEffect, useRef, useState } from "react";
import { NotificationType } from "@/lib/generated/prisma/client";
import { NOTIFICATION_ICON_MAP } from "@/lib/notifications/icon-map";
import type { TypePreference, NotificationPreferences } from "@/lib/notifications/preferences";
import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";

// Human-readable labels for each type
const TYPE_LABELS: Record<NotificationType, string> = {
  [NotificationType.NEW_MESSAGE]: "New messages",
  [NotificationType.BADGE_EARNED]: "Badges earned",
  [NotificationType.RAFFLE_WON]: "Raffles won",
  [NotificationType.QC_EARNED]: "QuackCoins received",
  [NotificationType.COURSE_COMPLETED]: "Courses completed",
  [NotificationType.LESSON_COMPLETED]: "Lessons completed",
  [NotificationType.REFERRAL_REWARD]: "Referral rewards",
  [NotificationType.MEMBERSHIP_EXPIRING]: "Membership expiring",
  [NotificationType.SYSTEM]: "System notifications",
  [NotificationType.PROMO]: "Promotions & offers",
};

const ALL_TYPES = Object.values(NotificationType);

interface ToggleProps {
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
  label: string;
}

function Toggle({ checked, disabled, onChange, label }: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        "relative h-5 w-9 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        checked ? "bg-primary" : "bg-input",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span
        className={cn(
          "absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
          checked && "translate-x-4",
        )}
      />
    </button>
  );
}

export default function NotificationPreferencesPage() {
  const [prefs, setPrefs] = useState<NotificationPreferences>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushGranted, setPushGranted] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPushGranted(Notification.permission === "granted");
    }
    fetch("/api/user/notification-preferences")
      .then((r) => r.json())
      .then((d: { preferences: NotificationPreferences }) => setPrefs(d.preferences))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleToggle(type: NotificationType, channel: keyof TypePreference, value: boolean) {
    const updated = {
      ...prefs,
      [type]: { ...(prefs[type] ?? { inApp: true, push: true }), [channel]: value },
    };
    setPrefs(updated);

    // Debounced save
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        await fetch("/api/user/notification-preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ preferences: updated }),
        });
      } catch {
        // Fail silently
      } finally {
        setSaving(false);
      }
    }, 800);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notification preferences</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose how you want to receive each type of notification.
          </p>
        </div>
        {saving && <span className="text-xs text-muted-foreground">Saving...</span>}
      </div>

      {/* Column headers */}
      <div className="mb-2 flex items-center px-4">
        <span className="flex-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Type
        </span>
        <span className="w-20 text-center text-xs font-medium text-muted-foreground uppercase tracking-wide">
          In-app
        </span>
        <span className="w-20 text-center text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Push
        </span>
      </div>

      <div className="rounded-xl border divide-y overflow-hidden bg-card">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
                <div className="h-3 flex-1 animate-pulse rounded bg-muted" />
                <div className="h-5 w-9 animate-pulse rounded-full bg-muted" />
                <div className="h-5 w-9 animate-pulse rounded-full bg-muted" />
              </div>
            ))
          : ALL_TYPES.map((type) => {
              const pref = prefs[type] ?? { inApp: true, push: true };
              const config = NOTIFICATION_ICON_MAP[type];
              const { Icon, colorClass, bgClass } = config;

              return (
                <div key={type} className="flex items-center gap-3 px-4 py-3">
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      bgClass,
                    )}
                  >
                    <Icon className={cn("h-4 w-4", colorClass)} />
                  </span>
                  <span className="flex-1 text-sm">{TYPE_LABELS[type]}</span>
                  <div className="flex w-20 justify-center">
                    <Toggle
                      checked={pref.inApp}
                      onChange={(v) => handleToggle(type, "inApp", v)}
                      label={`In-app: ${TYPE_LABELS[type]}`}
                    />
                  </div>
                  <div className="flex w-20 items-center justify-center gap-1">
                    {!pushGranted && (
                      <Lock
                        className="h-3 w-3 text-muted-foreground/60"
                        aria-label="Enable push permissions in your browser"
                      />
                    )}
                    <Toggle
                      checked={pref.push && pushGranted}
                      disabled={!pushGranted}
                      onChange={(v) => handleToggle(type, "push", v)}
                      label={`Push: ${TYPE_LABELS[type]}`}
                    />
                  </div>
                </div>
              );
            })}
      </div>

      {!pushGranted && (
        <p className="mt-3 text-xs text-muted-foreground">
          <Lock className="mr-1 inline h-3 w-3" />
          Push notifications are blocked by your browser. Enable them in your browser settings to
          use this feature.
        </p>
      )}
    </div>
  );
}
