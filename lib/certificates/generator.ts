// lib/certificates/generator.ts
// Generates and stores a Certificate record for a user-course completion.
// certificateHash = SHA256(userId + courseId + issuedAt ISO string)

import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import type { Certificate } from "@/lib/generated/prisma/client";

export interface CertificateData {
  id: string;
  userId: string;
  courseId: string;
  certificateHash: string;
  issuedAt: Date;
}

/**
 * Generate a SHA-256 certificate hash from userId, courseId, and issuedAt.
 */
function buildHash(userId: string, courseId: string, issuedAt: Date): string {
  return createHash("sha256")
    .update(`${userId}:${courseId}:${issuedAt.toISOString()}`)
    .digest("hex");
}

/**
 * Create a Certificate record for a user completing a course.
 * Idempotent: returns the existing certificate if it already exists.
 */
export async function generateCertificate(
  userId: string,
  courseId: string,
): Promise<CertificateData> {
  // Check for existing certificate (@@unique on userId + courseId)
  const existing = await prisma.certificate.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });

  if (existing) {
    // Re-derive hash from stored issuedAt for consistency
    const hash = buildHash(userId, courseId, existing.issuedAt);
    return {
      id: existing.id,
      userId: existing.userId,
      courseId: existing.courseId,
      certificateHash: hash,
      issuedAt: existing.issuedAt,
    };
  }

  const issuedAt = new Date();
  const hash = buildHash(userId, courseId, issuedAt);

  const cert: Certificate = await prisma.certificate.create({
    data: {
      userId,
      courseId,
      certificateUrl: null, // Could be set to a generated PDF URL in future
      issuedAt,
    },
  });

  return {
    id: cert.id,
    userId: cert.userId,
    courseId: cert.courseId,
    certificateHash: hash,
    issuedAt: cert.issuedAt,
  };
}
