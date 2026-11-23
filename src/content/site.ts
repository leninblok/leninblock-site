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
// Pin downloads to the verified release: asset names include the version.
// Update URLs, sizes and installation notes together when publishing a new release.
export const kruzhokRelease = {
  version: "1.1.0",
  url: "https://github.com/leninblok/floating-camera/releases/tag/v1.1.0",
  checksumsUrl:
    "https://github.com/leninblok/floating-camera/releases/download/v1.1.0/SHA256SUMS",
};
export type Download = {
  label: string;
  url: string;
  detail: string;
  platform: "mac" | "windows";
};
export const kruzhokDownloads: readonly Download[] = [
  {
    platform: "mac",
    label: "Mac · Apple Silicon и Intel",
    detail: "Универсальный DMG · 226 МБ",
    url: "https://github.com/leninblok/floating-camera/releases/download/v1.1.0/Kruzhok-1.1.0-mac-universal.dmg",
  },
  {
    platform: "windows",
    label: "Windows x64",
    detail: "EXE · 123 МБ",
    url: "https://github.com/leninblok/floating-camera/releases/download/v1.1.0/Kruzhok-1.1.0-windows-x64-Setup.exe",
  },
];
