import type { Metadata } from "next";

export const siteUrl = "https://leninblock.ru";
// Verified: the apex domain redirects to www (HTTP 308).
export const gameUrl = "https://www.wherefrombible.ru/";

export function pageMetadata(
  title: string,
  description: string,
  path: string,
): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      siteName: "Ленинблок",
      locale: "ru_RU",
      type: "website",
      images: [
        {
          url: `/og/${path === "/" ? "home" : path.slice(1)}.png`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/og/${path === "/" ? "home" : path.slice(1)}.png`],
    },
  };
}

// TODO(owner): add a real recording of Kruzhok. Do not substitute a fabricated screenshot.
// Private release v1.1.0 exists; its assets must not be linked as public downloads.
// Before adding links: publish approved installers separately, verify signatures and anonymous downloads.
export type Download = { label: string; url: string; detail: string };
export const kruzhokDownloads: readonly Download[] = [];
