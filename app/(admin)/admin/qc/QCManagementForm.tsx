"use client";

// app/(admin)/admin/qc/QCManagementForm.tsx
// Grant or deduct QC for a specific user.

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const schema = z.object({
  userId: z.string().min(1, "User ID is required"),
  amount: z.number().int().min(1, "Amount must be at least 1"),
  reason: z.string().min(3, "Reason must be at least 3 characters"),
  action: z.enum(["grant", "deduct"]),
  forceDeduct: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface QCManagementFormProps {
  onSuccess?: (message: string) => void;
}

export function QCManagementForm({ onSuccess }: QCManagementFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { action: "grant", forceDeduct: false },
  });

  const action = watch("action");

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    setError(null);

    const endpoint =
      data.action === "grant"
        ? "/api/admin/qc/grant"
        : "/api/admin/qc/deduct";

    const body =
      data.action === "deduct"
        ? { userId: data.userId, amount: data.amount, reason: data.reason, forceDeduct: data.forceDeduct }
        : { userId: data.userId, amount: data.amount, reason: data.reason };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const json: unknown = await res.json();
        const msg: string =
          json !== null &&
          typeof json === "object" &&
          "error" in json &&
          typeof (json as Record<string, unknown>).error === "string"
            ? ((json as Record<string, string>).error ?? "Operation failed")
            : "Operation failed";
        setError(msg);
        return;
      }

      reset();
      onSuccess?.(
        `Successfully ${data.action === "grant" ? "granted" : "deducted"} ${data.amount} QC`,
      );
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Action selector */}
        <div className="space-y-1.5">
          <Label>Action</Label>
          <Select
            value={action}
            onValueChange={(v) => setValue("action", v as "grant" | "deduct")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="grant">Grant QC</SelectItem>
              <SelectItem value="deduct">Deduct QC</SelectItem>
            </SelectContent>
          </Select>
          {errors.action && (
            <p className="text-xs text-destructive">{errors.action.message}</p>
          )}
        </div>

        {/* Amount */}
        <div className="space-y-1.5">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            type="number"
            min={1}
            placeholder="100"
            {...register("amount", { valueAsNumber: true })}
          />
          {errors.amount && (
            <p className="text-xs text-destructive">{errors.amount.message}</p>
          )}
        </div>
      </div>

      {/* User ID */}
      <div className="space-y-1.5">
        <Label htmlFor="userId">User ID</Label>
        <Input
          id="userId"
          placeholder="clxxx..."
          {...register("userId")}
        />
        {errors.userId && (
          <p className="text-xs text-destructive">{errors.userId.message}</p>
        )}
      </div>

      {/* Reason */}
      <div className="space-y-1.5">
        <Label htmlFor="reason">Reason</Label>
        <Textarea
          id="reason"
          placeholder="Course completion bonus..."
          rows={2}
          {...register("reason")}
        />
        {errors.reason && (
          <p className="text-xs text-destructive">{errors.reason.message}</p>
        )}
      </div>

      {/* Force deduct option (only for deduct) */}
      {action === "deduct" && (
        <div className="flex items-center gap-3">
          <Switch
            id="forceDeduct"
            checked={watch("forceDeduct")}
            onCheckedChange={(v) => setValue("forceDeduct", v)}
          />
          <Label
            htmlFor="forceDeduct"
            className="cursor-pointer text-sm font-normal text-muted-foreground"
          >
            Force deduct (allow negative balance — logged as ADMIN_OVERRIDE)
          </Label>
        </div>
      )}

      <Button
        type="submit"
        disabled={loading}
        variant={action === "deduct" ? "destructive" : "default"}
        className="w-full"
      >
        {loading
          ? "Processing…"
          : action === "grant"
            ? "Grant QC"
            : "Deduct QC"}
      </Button>
    </form>
  );
}
