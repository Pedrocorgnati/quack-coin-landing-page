"use client";

// components/affiliate/AffiliateSection.tsx
// Client wrapper: AffiliateLinkGenerator + AffiliateLinksList + cashback table.

import { useState } from "react";
import { AffiliateLinkGenerator } from "./AffiliateLinkGenerator";
import { AffiliateLinksList } from "./AffiliateLinksList";
import { CashbackHistoryTable } from "./CashbackHistoryTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AffiliateSection() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-6">
      {/* Link Generator */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Generate Affiliate Link</CardTitle>
        </CardHeader>
        <CardContent>
          <AffiliateLinkGenerator onCreated={() => setRefreshKey((k) => k + 1)} />
        </CardContent>
      </Card>

      {/* Links List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Links</CardTitle>
        </CardHeader>
        <CardContent>
          <AffiliateLinksList refreshKey={refreshKey} />
        </CardContent>
      </Card>

      {/* Cashback */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cashback History</CardTitle>
        </CardHeader>
        <CardContent>
          <CashbackHistoryTable />
        </CardContent>
      </Card>
    </div>
  );
}
