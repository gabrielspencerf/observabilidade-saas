import type { MetadataRoute } from "next";
import { getAppBaseUrl } from "./seo";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getAppBaseUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/dashboard", "/api", "/forbidden", "/reset-password"],
      },
    ],
    sitemap: [new URL("/sitemap.xml", baseUrl).toString()],
    host: baseUrl.origin,
  };
}
