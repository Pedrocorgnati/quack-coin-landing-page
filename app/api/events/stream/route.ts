// app/api/events/stream/route.ts
// GET — unified SSE endpoint for both messenger and notification events.
// Single stream per user; replaces /api/messenger/stream.
// NOTE: SSE connections are in-memory. PM2 must run in single-process mode (not cluster). (ADR-0006)

import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/getSession";
import { SseManager } from "@/lib/sse/sseManager";

export const dynamic = "force-dynamic";

const PING_INTERVAL_MS = 25_000;

export async function GET(req: Request): Promise<Response | NextResponse> {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Register with the global SSE manager (evicts any existing connection)
      SseManager.subscribe(userId, controller);

      // Send initial ping so the client knows the connection is live
      controller.enqueue(encoder.encode(`event: ping\ndata: {}\n\n`));

      // Keepalive ping every 25s to prevent proxy/firewall timeouts
      const pingTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`event: ping\ndata: {}\n\n`));
        } catch {
          clearInterval(pingTimer);
        }
      }, PING_INTERVAL_MS);

      // Clean up when the client disconnects (AbortSignal from Next.js)
      req.signal.addEventListener("abort", () => {
        clearInterval(pingTimer);
        SseManager.unsubscribe(userId);
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
    cancel() {
      SseManager.unsubscribe(userId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // disable Nginx buffering
    },
  });
}
