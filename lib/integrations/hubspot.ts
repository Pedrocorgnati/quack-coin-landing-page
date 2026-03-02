// lib/integrations/hubspot.ts
// HubSpot CRM client for lead capture. Gracefully disabled when HUBSPOT_API_KEY is absent.

const HUBSPOT_API_BASE = "https://api.hubapi.com";

interface ContactProperties {
  email: string;
  hs_lead_status?: string;
  quackcoin_source?: string;
  quackcoin_signup_date?: string;
  [key: string]: string | undefined;
}

interface HubSpotContactResult {
  id: string;
}

/**
 * Lightweight HubSpot client using the native fetch API.
 * Does not depend on @hubspot/api-client to avoid adding a heavy dependency.
 */
export class HubSpotClient {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private get headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  /**
   * Creates a new contact or updates an existing one (409 → update).
   * Retries once on 429 (rate limit).
   */
  async createContact(
    email: string,
    extraProperties?: Omit<ContactProperties, "email">,
  ): Promise<HubSpotContactResult | null> {
    const properties: ContactProperties = {
      email,
      hs_lead_status: "NEW",
      quackcoin_source: "landing_page",
      quackcoin_signup_date: new Date().toISOString().split("T")[0]!,
      ...extraProperties,
    };

    const body = JSON.stringify({ properties });

    let response = await fetch(`${HUBSPOT_API_BASE}/crm/v3/objects/contacts`, {
      method: "POST",
      headers: this.headers,
      body,
    });

    // Retry once on 429
    if (response.status === 429) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      response = await fetch(`${HUBSPOT_API_BASE}/crm/v3/objects/contacts`, {
        method: "POST",
        headers: this.headers,
        body,
      });
    }

    // 409 Conflict — contact already exists, update instead
    if (response.status === 409) {
      return this.updateContactByEmail(email, properties);
    }

    if (!response.ok) {
      console.error("[HubSpot] createContact failed:", response.status, await response.text());
      return null;
    }

    const data = (await response.json()) as HubSpotContactResult;
    return data;
  }

  /**
   * Updates an existing contact found by email (PATCH by ID after search).
   */
  private async updateContactByEmail(
    email: string,
    properties: ContactProperties,
  ): Promise<HubSpotContactResult | null> {
    // Search for the existing contact
    const searchRes = await fetch(`${HUBSPOT_API_BASE}/crm/v3/objects/contacts/search`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        filterGroups: [
          {
            filters: [
              { propertyName: "email", operator: "EQ", value: email },
            ],
          },
        ],
        limit: 1,
        properties: ["email"],
      }),
    });

    if (!searchRes.ok) return null;

    const searchData = (await searchRes.json()) as { results: HubSpotContactResult[] };
    const contact = searchData.results[0];
    if (!contact) return null;

    // PATCH the existing contact
    const { email: _email, ...updateProperties } = properties;
    void _email;

    const patchRes = await fetch(
      `${HUBSPOT_API_BASE}/crm/v3/objects/contacts/${contact.id}`,
      {
        method: "PATCH",
        headers: this.headers,
        body: JSON.stringify({ properties: updateProperties }),
      },
    );

    if (!patchRes.ok) return null;
    return contact;
  }

  /**
   * Adds a contact to a HubSpot list by contact ID and list ID.
   */
  async addToList(contactId: string, listId: string): Promise<boolean> {
    const res = await fetch(
      `${HUBSPOT_API_BASE}/contacts/v1/lists/${listId}/add`,
      {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({ vids: [] }),
      },
    );

    if (!res.ok) {
      // Try with the v3 memberships API as fallback
      const v3Res = await fetch(
        `${HUBSPOT_API_BASE}/crm/v3/lists/${listId}/memberships/add`,
        {
          method: "PUT",
          headers: this.headers,
          body: JSON.stringify({ recordIdsToAdd: [contactId] }),
        },
      );
      return v3Res.ok;
    }
    return true;
  }
}

/**
 * Returns a configured HubSpotClient if HUBSPOT_API_KEY is set, otherwise null.
 * Usage: const hs = getHubSpotClient(); if (hs) { ... }
 */
export function getHubSpotClient(): HubSpotClient | null {
  const apiKey = process.env.HUBSPOT_API_KEY;
  if (!apiKey) return null;
  return new HubSpotClient(apiKey);
}
