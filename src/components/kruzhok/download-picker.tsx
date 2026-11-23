"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { kruzhokDownloads, kruzhokRelease } from "@/content/site";
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
  const picker = useRef<HTMLDetailsElement>(null);
  const selected =
    platform === "mac"
      ? kruzhokDownloads.find((item) => item.platform === "mac")
      : platform === "windows"
        ? kruzhokDownloads.find((item) => item.platform === "windows")
        : undefined;

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (picker.current && !picker.current.contains(event.target as Node))
        picker.current.open = false;
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && picker.current?.open) {
        picker.current.open = false;
        picker.current.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, []);

  return (
    <div className="kruzhok-download" id="download">
      {selected ? (
        <a className="kruzhok-primary" href={selected.url}>
          Скачать для {platform === "mac" ? "Mac" : "Windows"}
        </a>
      ) : (
        <button
          className="kruzhok-primary"
          type="button"
          onClick={() => {
            if (picker.current) {
              picker.current.open = true;
              picker.current.querySelector("summary")?.focus();
            }
          }}
        >
          Скачать Кружок
        </button>
      )}
      <p className="kruzhok-release">
        Бесплатно · {kruzhokRelease.version}
        {platform === "windows"
          ? " · x64"
          : platform === "mac"
            ? " · Apple Silicon и Intel"
            : " · для Mac и Windows"}
      </p>
      <details className="kruzhok-picker" ref={picker}>
        <summary>Другие версии</summary>
        <div className="kruzhok-picker-panel">
          {kruzhokDownloads.map((item) => (
            <a
              className="kruzhok-platform-option"
              key={item.url}
              href={item.url}
              onClick={() => {
                if (picker.current) picker.current.open = false;
              }}
            >
              <span>{item.label}</span>
              <small>{item.detail}</small>
            </a>
          ))}
        </div>
      </details>
      <noscript>
        <div className="kruzhok-noscript">
          {kruzhokDownloads.map((item) => (
            <a key={item.url} href={item.url}>
              {item.label}
            </a>
          ))}
        </div>
      </noscript>
    </div>
  );
}
