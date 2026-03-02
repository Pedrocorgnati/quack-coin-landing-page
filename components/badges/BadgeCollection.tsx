"use client";

// components/badges/BadgeCollection.tsx
// Category tabs + grid of BadgeCard components.
// Earned badges are full color; unearned are grayscale with lock icon.

import { useState } from "react";
import { BadgeCard } from "@/components/badges/BadgeCard";
import { Button } from "@/components/ui/button";
import type { BadgeWithEarnedStatus } from "@/lib/services/badge.service";
import { BadgeCategory } from "@/lib/generated/prisma/client";

const CATEGORY_LABELS: Record<BadgeCategory, string> = {
  [BadgeCategory.LOYALTY]: "Loyalty",
  [BadgeCategory.LEARNING]: "Learning",
  [BadgeCategory.TRADING]: "Trading",
  [BadgeCategory.ACHIEVEMENT]: "Achievement",
  [BadgeCategory.SOCIAL]: "Social",
  [BadgeCategory.SPECIAL]: "Special",
};

interface BadgeCollectionProps {
  badges: BadgeWithEarnedStatus[];
}

export function BadgeCollection({ badges }: BadgeCollectionProps) {
  // Get categories that have at least one badge
  const categories = Object.values(BadgeCategory).filter((cat) =>
    badges.some((b) => b.category === cat),
  );

  const [activeCategory, setActiveCategory] = useState<BadgeCategory>(
    categories[0] ?? BadgeCategory.LOYALTY,
  );

  const filteredBadges = badges.filter((b) => b.category === activeCategory);
  const earnedInCategory = filteredBadges.filter((b) => b.earned).length;

  return (
    <div className="space-y-4">
      {/* Category tabs */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => {
          const earned = badges.filter((b) => b.category === cat && b.earned).length;
          const total = badges.filter((b) => b.category === cat).length;
          return (
            <Button
              key={cat}
              size="sm"
              variant={activeCategory === cat ? "default" : "outline"}
              className="h-8 text-xs"
              onClick={() => setActiveCategory(cat)}
            >
              {CATEGORY_LABELS[cat]}
              <span className="ml-1.5 text-muted-foreground">
                {earned}/{total}
              </span>
            </Button>
          );
        })}
      </div>

      {/* Stats line */}
      <p className="text-sm text-muted-foreground">
        {earnedInCategory} of {filteredBadges.length} badges earned in{" "}
        <span className="font-medium text-foreground">
          {CATEGORY_LABELS[activeCategory]}
        </span>
      </p>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {filteredBadges.map((badge) => (
          <BadgeCard key={badge.id} badge={badge} />
        ))}
      </div>
    </div>
  );
}
