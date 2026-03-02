// lib/audit/audit-log.ts
// Admin action audit log helper.
// Writes to AdminActionLog table (model: admin_action_logs).

import { prisma } from "@/lib/prisma";

export interface AuditMetadata {
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  reason?: string;
  [key: string]: unknown;
}

/**
 * Log an admin action to the audit log.
 * Never throws — errors are swallowed to prevent disrupting mutations.
 */
export async function logAdminAction(
  adminId: string,
  action: string,
  targetId: string,
  metadata: AuditMetadata = {},
  targetType?: string,
  ipAddress?: string,
): Promise<void> {
  try {
    await prisma.adminActionLog.create({
      data: {
        adminId,
        action,
        targetType: targetType ?? null,
        targetId,
        details: metadata as object,
        ipAddress: ipAddress ?? null,
      },
    });
  } catch {
    // Non-critical — never disrupt the main flow
  }
}
