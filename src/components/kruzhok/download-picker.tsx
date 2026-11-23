"use client";

import { useSyncExternalStore } from "react";
import { kruzhokDownloads } from "@/content/site";
import {
  detectDownloadPlatform,
  type DownloadPlatform,
} from "@/lib/download-platform";

const subscribe = () => () => {};
const getPlatform = () => detectDownloadPlatform(navigator);
const getServerPlatform = (): DownloadPlatform => "other";

export function DownloadPicker() {
  const platform = useSyncExternalStore(
    subscribe,
    getPlatform,
    getServerPlatform,
  );
  // Phones and unrecognised systems still get both direct downloads.
  const primaryPlatform = platform === "windows" ? "windows" : "mac";
  const primary = kruzhokDownloads.find(
    (item) => item.platform === primaryPlatform,
  )!;
  const secondary = kruzhokDownloads.find(
    (item) => item.platform !== primaryPlatform,
  )!;
  const name = (os: string) => (os === "mac" ? "Mac" : "Windows");

  return (
    <div className="kruzhok-download" id="download">
      <a className="kruzhok-primary" href={primary.url}>
        Скачать для {name(primary.platform)}
      </a>
      <a className="kruzhok-secondary" href={secondary.url}>
        Скачать для {name(secondary.platform)}
      </a>
    </div>
  );
}
