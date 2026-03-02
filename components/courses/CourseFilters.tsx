"use client";

// components/courses/CourseFilters.tsx
// Sidebar filter — updates URL search params on change.

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const DIFFICULTIES = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
] as const;

interface CourseFiltersProps {
  search: string;
  difficulty: string;
  onSearchChange?: (v: string) => void;
}

export function CourseFilters({ search, difficulty }: CourseFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  const hasFilters = search || difficulty;

  return (
    <aside className="space-y-6">
      {/* Difficulty */}
      <div>
        <Label className="text-sm font-medium mb-3 block">Difficulty</Label>
        <div className="space-y-2">
          {DIFFICULTIES.map((d) => (
            <label key={d.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="difficulty"
                value={d.value}
                checked={difficulty === d.value}
                onChange={() => updateParam("difficulty", d.value)}
                className="accent-primary"
              />
              <span className="text-sm">{d.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Clear */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground"
          onClick={() => {
            const params = new URLSearchParams();
            router.push(`${pathname}?${params.toString()}`);
          }}
        >
          <X className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
          Clear Filters
        </Button>
      )}
    </aside>
  );
}
