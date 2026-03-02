// app/api/admin/canned-responses/route.ts
// GET — list canned responses. POST — create canned response.

import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/auth/getSession";
import { prisma } from "@/lib/prisma";

const CreateSchema = z.object({
  title: z.string().min(1).max(100),
  body: z.string().min(1),
  shortcode: z
    .string()
    .min(2)
    .max(30)
    .regex(/^\/\w+$/, "Shortcode must start with / and contain only word characters"),
});

export async function GET(_req: Request): Promise<NextResponse> {
  const session = await getAuthSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const responses = await prisma.cannedResponse.findMany({
    where: { isActive: true },
    orderBy: { title: "asc" },
  });

  return NextResponse.json(responses);
}

export async function POST(req: Request): Promise<NextResponse> {
  const session = await getAuthSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body: unknown = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.cannedResponse.findUnique({
    where: { shortcode: parsed.data.shortcode },
  });
  if (existing) {
    return NextResponse.json({ error: "Shortcode already in use" }, { status: 409 });
  }

  const response = await prisma.cannedResponse.create({ data: parsed.data });
  return NextResponse.json(response, { status: 201 });
}
