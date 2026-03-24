import type { MetadataRoute } from "next";
import { INDEXABLE_PUBLIC_ROUTES, getAppBaseUrl } from "./seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getAppBaseUrl();
  const lastModified = new Date();

  return INDEXABLE_PUBLIC_ROUTES.map((route) => ({
    url: new URL(route, baseUrl).toString(),
    lastModified,
    changeFrequency: "weekly",
    priority: 1,
  }));
}
