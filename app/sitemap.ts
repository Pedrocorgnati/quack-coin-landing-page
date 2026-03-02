// app/sitemap.ts
// Next.js App Router sitemap for public pages. Auth-gated routes excluded.

import type { MetadataRoute } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://quackcoin.io";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes = ["/", "/landing", "/pricing", "/faq", "/about", "/roadmap"];

  return staticRoutes.map((route) => ({
    url: `${APP_URL}${route}`,
    lastModified: now,
    changeFrequency: route === "/" || route === "/landing" ? "weekly" : "monthly",
    priority: route === "/" || route === "/landing" ? 1.0 : 0.7,
  }));
}
