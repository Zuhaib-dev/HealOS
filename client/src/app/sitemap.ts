import type { MetadataRoute } from "next";
import { HEALOS_SITE_URL } from "@/lib/seo/metadata";

const publicPages = [
  "",
  "/about",
  "/features",
  "/developers",
  "/testimonials",
  "/contact",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return publicPages.map((path) => ({
    url: new URL(path, HEALOS_SITE_URL).toString(),
  }));
}
