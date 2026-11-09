import type { Metadata } from "next";

export const HEALOS_SITE_URL = "https://healos-theta.vercel.app";

type PageMetadataOptions = {
  canonical?: string;
  noIndex?: boolean;
};

export function createPageMetadata(
  title: string,
  description: string,
  options: PageMetadataOptions = {},
): Metadata {
  const fullTitle = `${title} | HealOS`;

  return {
    title,
    description,
    ...(options.canonical
      ? { alternates: { canonical: options.canonical } }
      : {}),
    ...(options.noIndex
      ? {
          robots: {
            index: false,
            follow: false,
            googleBot: { index: false, follow: false },
          },
        }
      : {}),
    openGraph: {
      type: "website",
      siteName: "HealOS",
      title: fullTitle,
      description,
      ...(options.canonical
        ? { url: new URL(options.canonical, HEALOS_SITE_URL).toString() }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      creator: "@xuhaib_x9",
    },
  };
}
