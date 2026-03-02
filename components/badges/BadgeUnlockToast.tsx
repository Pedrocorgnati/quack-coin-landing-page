"use client";

// components/badges/BadgeUnlockToast.tsx
// Special toast for badge unlock events — triggered by SSE notifications (module-15).
// Shows badge image, name, and confetti animation.

import Image from "next/image";
import { useEffect, useState } from "react";

interface BadgeUnlockToastProps {
  badgeName: string;
  badgeImageUrl: string;
  onDismiss?: () => void;
}

export function BadgeUnlockToast({ badgeName, badgeImageUrl, onDismiss }: BadgeUnlockToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!visible) return null;

  return (
    <div
      className="badge-unlock-toast fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border bg-card shadow-lg p-4 animate-badge-in"
      role="alert"
      aria-live="polite"
    >
      {/* Confetti overlay */}
      <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
        {Array.from({ length: 8 }).map((_, i) => (
          <span
            key={i}
            className="confetti-particle absolute"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${i * 0.1}s`,
              background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            }}
          />
        ))}
      </div>

      {/* Badge image */}
      <Image
        src={badgeImageUrl}
        alt={badgeName}
        width={48}
        height={48}
        className="rounded-full object-cover flex-shrink-0"
        unoptimized
      />

      {/* Text */}
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
          New badge unlocked!
        </p>
        <p className="font-bold text-sm truncate">{badgeName}</p>
      </div>

      {/* Dismiss */}
      <button
        onClick={() => {
          setVisible(false);
          onDismiss?.();
        }}
        className="ml-2 text-muted-foreground hover:text-foreground transition-colors text-lg leading-none"
        aria-label="Dismiss"
      >
        &times;
      </button>
    </div>
  );
}

const CONFETTI_COLORS = ["#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444", "#f97316"];
