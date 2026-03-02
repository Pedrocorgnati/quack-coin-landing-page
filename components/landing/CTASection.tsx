"use client";

// components/landing/CTASection.tsx
// Email invite request form. Posts to POST /api/public/request-invite.

import { useState } from "react";
import Image from "next/image";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle } from "lucide-react";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
});
type FormValues = z.infer<typeof schema>;

interface CTASectionProps {
  memberCount?: number;
  formId?: string;
}

export function CTASection({
  memberCount,
  formId = "invite-form",
}: CTASectionProps) {
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormValues) => {
    try {
      await fetch("/api/public/request-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });
      setSuccess(true);
    } catch {
      setSuccess(true); // Graceful degradation — show success even on network error
    }
  };

  return (
    <section id={formId} className="py-20 bg-[#1A1A1A] text-white">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
          Ready to start earning?
        </h2>
        <p className="text-gray-400 text-lg mb-3">
          QuackCoin is invite-only. Request access and we&apos;ll reach out when
          a spot opens up.
        </p>
        {memberCount !== undefined && (
          <p className="text-yellow-400 text-sm font-medium mb-8 flex items-center justify-center gap-2">
            <Image
              src="/rubber-duck.png"
              alt="QuackCoin"
              width={16}
              height={16}
              className="h-4 w-4"
            />
            {memberCount.toLocaleString("en-US")} members and counting
          </p>
        )}

        {success ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-green-500/30 bg-green-500/10 p-8">
            <CheckCircle className="h-12 w-12 text-green-400" />
            <p className="text-lg font-semibold text-green-300">
              We&apos;ll be in touch!
            </p>
            <p className="text-sm text-gray-400">
              We&apos;ll notify you when an invite becomes available.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
            noValidate
          >
            <div className="flex-1">
              <label htmlFor="invite-email" className="sr-only">
                Email address
              </label>
              <Input
                id="invite-email"
                type="email"
                placeholder="Enter your email"
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-500 focus:border-yellow-500"
                aria-describedby={errors.email ? "invite-email-error" : undefined}
                {...register("email")}
              />
              {errors.email && (
                <p
                  id="invite-email-error"
                  role="alert"
                  className="mt-1 text-xs text-red-400 text-left"
                >
                  {errors.email.message}
                </p>
              )}
            </div>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold"
            >
              {isSubmitting ? "Sending…" : "Request Access"}
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}
