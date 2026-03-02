"use client";

// components/affiliate/ClicksChart.tsx
// Line chart showing daily clicks over the selected date range using recharts.

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";

type Range = "7d" | "30d" | "90d";

interface DayData {
  date: string;
  count: number;
}

interface ClicksChartProps {
  onRangeChange?: (range: Range) => void;
  data: DayData[];
  currentRange: Range;
}

export function ClicksChart({ data, currentRange, onRangeChange }: ClicksChartProps) {
  const ranges: Range[] = ["7d", "30d", "90d"];

  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.date + "T12:00:00Z").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  }));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Daily Clicks</p>
        <div className="flex gap-1">
          {ranges.map((r) => (
            <Button
              key={r}
              size="sm"
              variant={currentRange === r ? "default" : "outline"}
              className="h-7 px-2.5 text-xs"
              onClick={() => onRangeChange?.(r)}
            >
              {r}
            </Button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={formatted}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{ fontSize: 12 }}
            formatter={(v) => [v ?? 0, "Clicks"]}
          />
          <Line
            type="monotone"
            dataKey="count"
            strokeWidth={2}
            dot={false}
            className="stroke-primary"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
