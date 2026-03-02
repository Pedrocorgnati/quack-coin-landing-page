// app/api/admin/canned-responses/[id]/route.ts
// PATCH — update. DELETE — soft-delete (isActive=false).

import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/auth/getSession";
import { prisma } from "@/lib/prisma";

const UpdateSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  body: z.string().min(1).optional(),
  shortcode: z
    .string()
    .min(2)
    .max(30)
    .regex(/^\/\w+$/)
    .optional(),
});

async function guardAdmin() {
  const session = await getAuthSession();
  if (!session || session.user.role !== "ADMIN") return null;
  return session;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  if (!(await guardAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body: unknown = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.cannedResponse.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  if (!(await guardAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.cannedResponse.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
}
