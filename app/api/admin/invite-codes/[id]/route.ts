// app/api/admin/invite-codes/[id]/route.ts
// Admin: revoke a specific invite code by ID.

import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/getSession";
import { InviteService } from "@/lib/services/invite.service";

async function requireAdmin() {
  const session = await getAuthSession();
  if (!session) return null;
  if (session.user.role !== "ADMIN") return null;
  return session;
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  try {
    await InviteService.revoke(id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invite code not found" }, { status: 404 });
  }
}
