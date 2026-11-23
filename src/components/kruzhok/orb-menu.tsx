"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export const sizePresets = [
  { id: "compact", label: "Компактный", scale: 0.22 },
  { id: "normal", label: "Обычный", scale: 0.34 },
  { id: "large", label: "Большой", scale: 0.46 },
  { id: "very-large", label: "Очень большой", scale: 0.58 },
] as const;
export type SizePreset = (typeof sizePresets)[number]["id"];
export type Point = { x: number; y: number };

type Props = {
  position: Point;
  size: SizePreset;
  cameraSelected: boolean;
  mirrored: boolean;
  shadow: boolean;
  border: boolean;
  paused: boolean;
  message: string;
  onSize: (size: SizePreset) => void;
  onSource: (source: "camera" | "video") => void;
  onMirror: () => void;
  onShadow: () => void;
  onBorder: () => void;
  onPlayback: () => void;
  onClose: (returnFocus?: boolean) => void;
};

export function OrbMenu(props: Props) {
  const { onClose } = props;
  const menu = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(props.position);
  useLayoutEffect(() => {
    const element = menu.current;
    if (!element) return;
    const bounds = element.getBoundingClientRect();
    setPosition({
      x: Math.max(
        8,
        Math.min(props.position.x, window.innerWidth - bounds.width - 8),
      ),
      y: Math.max(
        8,
        Math.min(props.position.y, window.innerHeight - bounds.height - 8),
      ),
    });
    element
      .querySelector<HTMLButtonElement>('[aria-checked="true"]')
      ?.focus({ preventScroll: true });
  }, [props.position, props.message, props.cameraSelected]);

  useLayoutEffect(() => {
    const outside = (event: PointerEvent) => {
      if (!menu.current?.contains(event.target as Node)) onClose();
    };
    const close = () => onClose();
    document.addEventListener("pointerdown", outside);
    window.addEventListener("resize", close);
    // A scroll can move the circle away from the opened menu.
    window.addEventListener("scroll", close);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close);
    };
  }, [onClose]);

  const choose = (action: () => void) => {
    action();
    onClose(true);
  };
  const check = (selected: boolean) => (
    <span className="kruzhok-menu-check" aria-hidden="true">
      {selected ? "✓" : ""}
    </span>
  );

  return createPortal(
    <div
      ref={menu}
      role="menu"
      aria-label="Настройки кружка"
      className="kruzhok-context-menu"
      style={{ left: position.x, top: position.y }}
      onContextMenu={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        const items = [
          ...menu.current!.querySelectorAll<HTMLButtonElement>(
            '[role^="menuitem"]',
          ),
        ];
        const index = items.indexOf(
          document.activeElement as HTMLButtonElement,
        );
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          onClose(true);
        } else if (event.key === "Tab") onClose(true);
        else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
          event.preventDefault();
          const next =
            event.key === "Home"
              ? 0
              : event.key === "End"
                ? items.length - 1
                : (index +
                    (event.key === "ArrowDown" ? 1 : -1) +
                    items.length) %
                  items.length;
          items[next]?.focus();
        }
      }}
    >
      <div role="group" aria-label="Источник">
        <div className="kruzhok-menu-heading" aria-hidden="true">
          Источник
        </div>
        {(
          [
            ["camera", "Моя камера"],
            ["video", "Видео Леонида"],
          ] as const
        ).map(([source, label]) => {
          const selected =
            source === "camera" ? props.cameraSelected : !props.cameraSelected;
          return (
            <button
              key={source}
              role="menuitemradio"
              aria-checked={selected}
              tabIndex={-1}
              onClick={() => choose(() => props.onSource(source))}
            >
              {check(selected)}
              {label}
            </button>
          );
        })}
        {props.message && (
          <p className="kruzhok-menu-message" role="status">
            {props.message}
          </p>
        )}
      </div>
      <div role="separator" />
      <div role="group" aria-label="Размер">
        <div className="kruzhok-menu-heading" aria-hidden="true">
          Размер
        </div>
        {sizePresets.map((preset) => (
          <button
            key={preset.id}
            role="menuitemradio"
            aria-checked={props.size === preset.id}
            tabIndex={-1}
            onClick={() => choose(() => props.onSize(preset.id))}
          >
            {check(props.size === preset.id)}
            {preset.label}
          </button>
        ))}
      </div>
      <div role="separator" />
      {(
        [
          ["Отразить по горизонтали", props.mirrored, props.onMirror],
          ["Контур", props.border, props.onBorder],
          ["Тень", props.shadow, props.onShadow],
        ] as const
      ).map(([label, checked, action]) => (
        <button
          key={label}
          role="menuitemcheckbox"
          aria-checked={checked}
          tabIndex={-1}
          onClick={() => choose(action)}
        >
          {check(checked)}
          {label}
        </button>
      ))}
      {!props.cameraSelected && (
        <>
          <div role="separator" />
          <button
            role="menuitem"
            tabIndex={-1}
            onClick={() => choose(props.onPlayback)}
          >
            {check(false)}
            {props.paused ? "Воспроизвести видео" : "Приостановить видео"}
          </button>
        </>
      )}
    </div>,
    document.body,
  );
}
