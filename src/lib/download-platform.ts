export type DownloadPlatform = "mac" | "windows" | "other";
export function detectDownloadPlatform(info: {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
}): DownloadPlatform {
  const ua = info.userAgent;
  if (
    /Android|iPhone|iPad|iPod/i.test(ua) ||
    (/Mac/i.test(info.platform) && info.maxTouchPoints > 1)
  )
    return "other";
  if (/Windows/i.test(ua) || /^Win/i.test(info.platform)) return "windows";
  if (/Macintosh|Mac OS X/i.test(ua) || /^Mac/i.test(info.platform))
    return "mac";
  return "other";
}
