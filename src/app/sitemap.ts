import type { MetadataRoute } from "next";
import { siteUrl } from "@/content/site";
export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/kruzhok", "/bible"].map((path) => ({
    url: `${siteUrl}${path === "/" ? "" : path}`,
  }));
}
