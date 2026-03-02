// app/api/messenger/messages/route.ts
// POST — admin sends a message to a user.

import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/auth/getSession";
import { MessengerService } from "@/lib/services/messenger.service";

const SendSchema = z.object({
  toUserId: z.string().min(1),
  content: z.string().min(1).max(5000),
});

export async function POST(req: Request): Promise<NextResponse> {
  const session = await getAuthSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body: unknown = await req.json();
  const parsed = SendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const message = await MessengerService.sendToUser(
    session.user.id,
    parsed.data.toUserId,
    parsed.data.content,
  );

  return NextResponse.json(message, { status: 201 });
}
