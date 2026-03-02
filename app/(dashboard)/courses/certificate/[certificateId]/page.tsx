// app/(dashboard)/courses/certificate/[certificateId]/page.tsx
// Certificate display page. Verifiable via SHA-256 hash.

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createHash } from "crypto";
import { Award, CheckCircle2, Calendar, BookOpen } from "lucide-react";
import { getAuthSession } from "@/lib/auth/getSession";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";

interface PageProps {
  params: Promise<{ certificateId: string }>;
}

export const metadata: Metadata = { title: "Certificate of Completion" };

export default async function CertificatePage({ params }: PageProps) {
  const { certificateId } = await params;
  const session = await getAuthSession();
  if (!session) redirect("/login");

  const cert = await prisma.certificate.findUnique({
    where: { id: certificateId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      course: { select: { id: true, title: true, slug: true, description: true } },
    },
  });

  if (!cert) notFound();

  // Only the cert owner can view it (or admins — kept simple here)
  if (cert.userId !== session.user.id) notFound();

  // Derive verification hash from stable fields
  const verificationHash = createHash("sha256")
    .update(`${cert.userId}:${cert.courseId}:${cert.issuedAt.toISOString()}`)
    .digest("hex");

  const formattedDate = cert.issuedAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href={`/courses/${cert.course.slug}`}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        ← Back to Course
      </Link>

      {/* Certificate card */}
      {/* @ASSET_PLACEHOLDER
      name: certificate-background
      type: image
      extension: png
      aspect_ratio: 4:3
      dimensions: 1200x900
      description: Elegant certificate background with subtle golden border and QuackCoin brand watermark. Professional achievement document style.
      context: Background of the certificate card
      style: professional certificate, warm golden tones, subtle duck motif watermark
      mood: prestigious, accomplished, celebratory
      colors: #D4A574, #F5F0E8, #1C1917
      elements: golden border, subtle watermark, clean white center, parchment texture
      avoid: busy patterns, bright colors, text
      */}
      <div
        className="relative rounded-xl border border-yellow-500/30 bg-gradient-to-br from-yellow-50/80 to-amber-50/40 dark:from-yellow-900/10 dark:to-amber-900/5 p-8 shadow-lg overflow-hidden"
        aria-label="Certificate of Completion"
      >
        {/* Decorative corner accent */}
        <div
          className="absolute top-0 right-0 w-24 h-24 opacity-10"
          aria-hidden="true"
        >
          <Award className="w-full h-full text-yellow-600" />
        </div>

        {/* Header */}
        <div className="text-center space-y-2 mb-6">
          <Award
            className="h-10 w-10 mx-auto text-yellow-600 dark:text-yellow-400"
            aria-hidden="true"
          />
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
            Certificate of Completion
          </p>
          <h1 className="text-2xl font-bold tracking-tight">QuackCoin Academy</h1>
        </div>

        {/* Body */}
        <div className="text-center space-y-3">
          <p className="text-sm text-muted-foreground">This certifies that</p>
          <p className="text-xl font-semibold">
            {cert.user.name ?? cert.user.email}
          </p>
          <p className="text-sm text-muted-foreground">has successfully completed</p>
          <p className="text-lg font-bold text-yellow-700 dark:text-yellow-400">
            {cert.course.title}
          </p>
        </div>

        {/* Footer */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground border-t border-yellow-500/20 pt-4">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
            Issued {formattedDate}
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" aria-hidden="true" />
            Verified
          </span>
        </div>
      </div>

      {/* Verification */}
      <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
        <p className="text-sm font-medium">Verification Hash</p>
        <p className="text-xs font-mono break-all text-muted-foreground select-all">
          {verificationHash}
        </p>
        <p className="text-xs text-muted-foreground">
          Certificate ID: <span className="font-mono">{cert.id}</span>
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Link href="/courses">
          <Button variant="outline" size="sm">
            <BookOpen className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
            Browse More Courses
          </Button>
        </Link>
        <Link href="/dashboard">
          <Button variant="outline" size="sm">
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
