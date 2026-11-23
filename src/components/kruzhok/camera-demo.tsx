"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { OrbMenu, sizePresets, type Point, type SizePreset } from "./orb-menu";

const VIDEO = "/kruzhok/intro.mp4";
const POSTER = "/kruzhok/intro-poster.jpg";
type Mode = "demo" | "requesting" | "live";
type Drag = {
  id: number;
  start: Point;
  origin: Point;
  timer?: ReturnType<typeof setTimeout>;
};
function subscribeMotion(callback: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const serverReducedMotion = () => true;

// Match the desktop app's circular presets: usable display minus its margins
// (24px horizontally, 48px vertically) and 44px shadow inset on each side.
function diameterFor(preset: SizePreset) {
  const available =
    window.innerWidth <= 600
      ? Math.min(480, window.innerWidth - 24)
      : Math.min(
          (window.screen.availWidth || window.innerWidth) - 136,
          (window.screen.availHeight || window.innerHeight) - 184,
        );
  const scale = sizePresets.find((item) => item.id === preset)!.scale;
  return Math.max(
    1,
    Math.min(
      window.innerWidth - 24,
      window.innerHeight - 24,
      Math.max(100, Math.round(available * scale)),
    ),
  );
}

export function CameraDemo() {
  const anchor = useRef<HTMLDivElement>(null);
  const orb = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const requestId = useRef(0);
  const requesting = useRef(false);
  const wantedSource = useRef<"camera" | "video">("camera");
  const pointer = useRef<Drag | null>(null);
  const moved = useRef(false);
  const previousSize = useRef(244);
  const [position, setPosition] = useState<Point | null>(null);
  const [dragging, setDragging] = useState(false);
  const [mode, setMode] = useState<Mode>("demo");
  const [message, setMessage] = useState("");
  const [size, setSize] = useState<SizePreset>("large");
  const [pixels, setPixels] = useState(244);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [menu, setMenu] = useState<Point | null>(null);
  const [mirrored, setMirrored] = useState(true);
  const [shadow, setShadow] = useState(true);
  const [border, setBorder] = useState(false);
  const [pausedByUser, setPausedByUser] = useState<boolean | null>(null);
  const [playbackBlocked, setPlaybackBlocked] = useState(false);
  const reducedMotion = useSyncExternalStore(
    subscribeMotion,
    prefersReducedMotion,
    serverReducedMotion,
  );
  const demoPaused = playbackBlocked || (pausedByUser ?? reducedMotion);

  const clamp = useCallback((point: Point): Point => {
    const diameter = orb.current?.offsetWidth ?? 244;
    return {
      x: Math.max(12, Math.min(point.x, window.innerWidth - diameter - 12)),
      y: Math.max(12, Math.min(point.y, window.innerHeight - diameter - 12)),
    };
  }, []);
  const reset = useCallback(() => {
    if (!anchor.current) return;
    const bounds = anchor.current.getBoundingClientRect();
    moved.current = false;
    setPosition(clamp({ x: bounds.x, y: bounds.y }));
  }, [clamp]);

  useLayoutEffect(() => {
    const resize = () => {
      setPixels(diameterFor(size));
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [size]);
  useLayoutEffect(() => {
    const oldSize = previousSize.current;
    previousSize.current = pixels;
    setPosition((previous) => {
      if (previous && moved.current)
        return clamp({
          x: previous.x + (oldSize - pixels) / 2,
          y: previous.y + (oldSize - pixels) / 2,
        });
      const bounds = anchor.current?.getBoundingClientRect();
      return bounds ? clamp({ x: bounds.x, y: bounds.y }) : previous;
    });
  }, [pixels, viewport, clamp]);

  const invalidateRequest = useCallback(() => {
    requestId.current++;
    requesting.current = false;
  }, []);
  const stopTracks = useCallback(() => {
    const current = stream.current;
    stream.current = null;
    current?.getTracks().forEach((track) => {
      track.onended = null;
      track.stop();
    });
  }, []);
  const suspendCamera = useCallback(() => {
    invalidateRequest();
    stopTracks();
    setMode("demo");
  }, [invalidateRequest, stopTracks]);
  const showDemo = useCallback(() => {
    wantedSource.current = "video";
    suspendCamera();
    setMessage("");
  }, [suspendCamera]);
  const startCamera = useCallback(async () => {
    if (document.hidden || requesting.current || stream.current) return;
    wantedSource.current = "camera";
    setMessage("");
    if (!navigator.mediaDevices?.getUserMedia) {
      wantedSource.current = "video";
      setMessage("Камера недоступна в этом браузере.");
      return;
    }
    const id = ++requestId.current;
    requesting.current = true;
    setMode("requesting");
    try {
      const camera = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      if (requestId.current !== id || document.hidden) {
        camera.getTracks().forEach((track) => track.stop());
        return;
      }
      requesting.current = false;
      stream.current = camera;
      camera.getVideoTracks().forEach((track) => {
        track.onended = showDemo;
      });
      setMode("live");
    } catch (error) {
      if (requestId.current !== id) return;
      requesting.current = false;
      wantedSource.current = "video";
      setMode("demo");
      setMessage(
        error instanceof Error && error.name === "NotAllowedError"
          ? "Доступ к камере закрыт в браузере."
          : "Камера недоступна.",
      );
    }
  }, [showDemo]);

  useEffect(() => {
    // Defer one microtask so Strict Mode's discarded mount never opens a
    // second permission request. A genuine mount requests the camera once.
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void startCamera();
    });
    const visibility = () => {
      if (document.hidden) suspendCamera();
      else if (wantedSource.current === "camera") void startCamera();
    };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", suspendCamera);
    return () => {
      cancelled = true;
      invalidateRequest();
      stopTracks();
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", suspendCamera);
    };
  }, [invalidateRequest, startCamera, stopTracks, suspendCamera]);

  useEffect(() => {
    const element = video.current;
    if (!element) return;
    let cancelled = false;
    if (mode === "live" && stream.current) {
      element.removeAttribute("src");
      element.srcObject = stream.current;
      element.loop = false;
      void element.play().catch(() => {
        if (!cancelled) {
          showDemo();
          setMessage("Не удалось показать камеру.");
        }
      });
    } else {
      element.srcObject = null;
      if (element.getAttribute("src") !== VIDEO) element.src = VIDEO;
      element.loop = true;
      if (demoPaused) element.pause();
      else
        void element.play().catch(() => {
          if (!cancelled) setPlaybackBlocked(true);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [mode, demoPaused, showDemo]);

  const closeMenu = useCallback((returnFocus = false) => {
    setMenu(null);
    if (returnFocus) orb.current?.focus({ preventScroll: true });
  }, []);
  const openMenu = (point: Point) => {
    if (pointer.current?.timer) clearTimeout(pointer.current.timer);
    pointer.current = null;
    setDragging(false);
    setMenu(point);
  };
  const down = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !event.isPrimary || event.ctrlKey) return;
    closeMenu();
    const bounds = event.currentTarget.getBoundingClientRect();
    const drag: Drag = {
      id: event.pointerId,
      start: { x: event.clientX, y: event.clientY },
      origin: { x: bounds.x, y: bounds.y },
    };
    pointer.current = drag;
    event.currentTarget.setPointerCapture(event.pointerId);
    if (event.pointerType === "touch")
      drag.timer = setTimeout(() => {
        if (pointer.current === drag) openMenu(drag.start);
      }, 550);
    setDragging(true);
  };
  const move = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = pointer.current;
    if (!current || current.id !== event.pointerId) return;
    const dx = event.clientX - current.start.x,
      dy = event.clientY - current.start.y;
    if (Math.abs(dx) + Math.abs(dy) < 5) return;
    clearTimeout(current.timer);
    setPosition(clamp({ x: current.origin.x + dx, y: current.origin.y + dy }));
    moved.current = true;
  };
  const clearDrag = useCallback(() => {
    clearTimeout(pointer.current?.timer);
    pointer.current = null;
    setDragging(false);
  }, []);
  const cancelLongPress = useCallback(() => {
    clearTimeout(pointer.current?.timer);
  }, []);
  useEffect(() => cancelLongPress, [cancelLongPress]);

  return (
    <>
      <div
        className="kruzhok-camera-anchor"
        ref={anchor}
        style={{ width: pixels, height: pixels }}
        aria-hidden="true"
      />
      <div
        className={`kruzhok-camera-orb${dragging ? " is-dragging" : ""}${mode === "live" ? " is-live" : ""}${mirrored ? " is-mirrored" : ""}${shadow ? " has-shadow" : ""}${border ? " has-border" : ""}`}
        ref={orb}
        role="button"
        tabIndex={0}
        aria-label="Кружок с видео"
        aria-describedby="kruzhok-drag-help"
        aria-haspopup="menu"
        aria-expanded={Boolean(menu)}
        style={{
          width: pixels,
          height: pixels,
          ...(position ? { left: position.x, top: position.y } : {}),
        }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={(event) => {
          clearDrag();
          if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={clearDrag}
        onLostPointerCapture={clearDrag}
        onContextMenu={(event) => {
          event.preventDefault();
          openMenu({ x: event.clientX, y: event.clientY });
        }}
        onKeyDown={(event) => {
          if (
            (event.key === "F10" && event.shiftKey) ||
            ["ContextMenu", "Enter", " "].includes(event.key)
          ) {
            event.preventDefault();
            const bounds = event.currentTarget.getBoundingClientRect();
            openMenu({
              x: bounds.x + bounds.width / 2,
              y: bounds.y + bounds.height / 2,
            });
            return;
          }
          const deltas: Record<string, Point> = {
            ArrowLeft: { x: -16, y: 0 },
            ArrowRight: { x: 16, y: 0 },
            ArrowUp: { x: 0, y: -16 },
            ArrowDown: { x: 0, y: 16 },
          };
          if (event.key === "Home") {
            event.preventDefault();
            reset();
          } else if (deltas[event.key]) {
            event.preventDefault();
            const delta = deltas[event.key],
              bounds = event.currentTarget.getBoundingClientRect();
            setPosition(
              clamp({ x: bounds.x + delta.x, y: bounds.y + delta.y }),
            );
            moved.current = true;
          }
        }}
      >
        <div className="kruzhok-camera-media">
          <video
            ref={video}
            src={VIDEO}
            poster={POSTER}
            muted
            playsInline
            loop
            preload="metadata"
            aria-label={
              mode === "live" ? "Ваша камера" : "Видео Леонида Макарова"
            }
          />
        </div>
      </div>
      {menu && (
        <OrbMenu
          position={menu}
          size={size}
          cameraSelected={mode !== "demo"}
          mirrored={mirrored}
          shadow={shadow}
          border={border}
          paused={demoPaused}
          message={message}
          onClose={closeMenu}
          onSize={setSize}
          onSource={(source) => {
            if (source === "video") showDemo();
            else void startCamera();
          }}
          onMirror={() => setMirrored((value) => !value)}
          onShadow={() => setShadow((value) => !value)}
          onBorder={() => setBorder((value) => !value)}
          onPlayback={() => {
            setPlaybackBlocked(false);
            setPausedByUser(!demoPaused);
          }}
        />
      )}
      <span id="kruzhok-drag-help" className="visually-hidden">
        Перетаскивайте кружок мышью, пальцем или стрелками. Настройки: правая
        кнопка мыши, долгое нажатие или Shift+F10. Home возвращает кружок на
        место.
      </span>
    </>
  );
}
