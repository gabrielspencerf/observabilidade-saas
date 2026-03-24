import type { MetadataRoute } from "next";
import { SEO_APP_NAME, SEO_DEFAULT_DESCRIPTION } from "./seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SEO_APP_NAME,
    short_name: SEO_APP_NAME,
    description: SEO_DEFAULT_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#0A0F1A",
    theme_color: "#00C882",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
