// app/robots.ts
// Next.js App Router robots.txt. Disallows auth-gated and API routes.

import type { MetadataRoute } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://quackcoin.io";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/admin", "/api", "/security", "/profile"],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
