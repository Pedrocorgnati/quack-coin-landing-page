// app/api/public/request-invite/route.ts
// POST /api/public/request-invite — stores email lead and (optionally) creates HubSpot contact.

import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { SiteConfigService } from "@/lib/services/siteConfig.service";
import { getHubSpotClient } from "@/lib/integrations/hubspot";

const bodySchema = z.object({
  email: z.string().email("Invalid email address"),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  let parsed: z.infer<typeof bodySchema>;

  try {
    const body = (await request.json()) as unknown;
    parsed = bodySchema.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { email } = parsed;

  try {
    // Store lead in SiteConfig as a simple list (comma-separated) for MVP
    const existing = await SiteConfigService.getOrDefault("leads.emails", "");
    const emails = existing ? existing.split(",").map((e) => e.trim()) : [];

    if (!emails.includes(email)) {
      emails.push(email);
      await SiteConfigService.set("leads.emails", emails.join(","));
    }
  } catch (err) {
    // Non-fatal — log and continue
    console.error("[request-invite] Failed to store lead:", err);
  }

  // HubSpot integration — non-blocking, fire-and-forget
  void (async () => {
    try {
      const hs = getHubSpotClient();
      if (!hs) return;

      const contact = await hs.createContact(email);
      if (!contact) return;

      const listId = process.env.HUBSPOT_LEADS_LIST_ID;
      if (listId) {
        await hs.addToList(contact.id, listId);
      }
    } catch (err) {
      // Graceful degradation — HubSpot errors must never surface to the user
      console.error("[request-invite] HubSpot integration error:", err);
    }
  })();

  return NextResponse.json({ success: true }, { status: 200 });
}
