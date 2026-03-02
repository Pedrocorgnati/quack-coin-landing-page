"use client";

// components/profile/ProfileForm.tsx
// Form for updating display name and avatar URL.

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

const schema = z.object({
  displayName: z.string().min(3, "Minimum 3 characters").max(50, "Maximum 50 characters"),
  avatarUrl: z.string().url("Must be a valid URL").or(z.literal("")),
});

type Form = z.infer<typeof schema>;

interface ProfileFormProps {
  initialName: string | null;
  initialAvatarUrl: string | null;
  email: string;
}

export function ProfileForm({ initialName, initialAvatarUrl, email }: ProfileFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      displayName: initialName ?? "",
      avatarUrl: initialAvatarUrl ?? "",
    },
  });

  const avatarUrl = watch("avatarUrl");

  async function onSubmit(data: Form) {
    setServerError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: data.displayName, avatarUrl: data.avatarUrl }),
      });
      const body = await res.json();
      if (!res.ok) {
        setServerError(body.error ?? "Update failed");
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setServerError("Something went wrong. Please try again.");
    }
  }

  const initials = (initialName ?? email).slice(0, 2).toUpperCase();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {serverError && (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}
      {saved && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>Profile updated successfully.</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={avatarUrl || undefined} alt="Avatar preview" />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="avatarUrl">Avatar URL</Label>
          <Input
            id="avatarUrl"
            type="url"
            placeholder="https://..."
            disabled={isSubmitting}
            {...register("avatarUrl")}
          />
          {errors.avatarUrl && (
            <p className="text-sm text-destructive">{errors.avatarUrl.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="displayName">Display Name</Label>
        <Input
          id="displayName"
          disabled={isSubmitting}
          {...register("displayName")}
        />
        {errors.displayName && (
          <p className="text-sm text-destructive">{errors.displayName.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Email</Label>
        <Input value={email} disabled readOnly />
        <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
      </div>

      <Button type="submit" disabled={isSubmitting || !isDirty}>
        {isSubmitting ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
        ) : "Save changes"}
      </Button>
    </form>
  );
}
