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

const VIDEO = "/kruzhok/intro.mp4";
const POSTER = "/kruzhok/intro-poster.jpg";
type Point = { x: number; y: number };
type Mode = "demo" | "requesting" | "live";
function subscribeMotion(callback: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const serverReducedMotion = () => true;

export function CameraDemo() {
  const anchor = useRef<HTMLDivElement>(null);
  const orb = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const requestId = useRef(0);
  const pointer = useRef<{ id: number; start: Point; origin: Point } | null>(
    null,
  );
  const [position, setPosition] = useState<Point | null>(null);
  const [dragging, setDragging] = useState(false);
  const [moved, setMoved] = useState(false);
  const movedRef = useRef(false);
  const [mode, setMode] = useState<Mode>("demo");
  const [message, setMessage] = useState("");
  const [pausedByUser, setPausedByUser] = useState<boolean | null>(null);
  const [playbackBlocked, setPlaybackBlocked] = useState(false);
  const reducedMotion = useSyncExternalStore(
    subscribeMotion,
    prefersReducedMotion,
    serverReducedMotion,
  );
  const demoPaused = playbackBlocked || (pausedByUser ?? reducedMotion);

  const clamp = useCallback((point: Point): Point => {
    const size = orb.current?.offsetWidth ?? 220;
    return {
      x: Math.max(12, Math.min(point.x, window.innerWidth - size - 12)),
      y: Math.max(12, Math.min(point.y, window.innerHeight - size - 36)),
    };
  }, []);
  const reset = useCallback(() => {
    if (!anchor.current) return;
    const bounds = anchor.current.getBoundingClientRect();
    setPosition(clamp({ x: bounds.x, y: bounds.y }));
    setMoved(false);
    movedRef.current = false;
  }, [clamp]);

  useLayoutEffect(() => {
    if (anchor.current) {
      const bounds = anchor.current.getBoundingClientRect();
      setPosition(clamp({ x: bounds.x, y: bounds.y }));
    }
    const resize = () =>
      setPosition((previous) => {
        if (!previous || !movedRef.current) {
          const bounds = anchor.current?.getBoundingClientRect();
          return bounds ? clamp({ x: bounds.x, y: bounds.y }) : previous;
        }
        return clamp(previous);
      });
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [clamp]);

  const invalidateRequest = useCallback(() => {
    requestId.current++;
  }, []);

  const stopTracks = useCallback(() => {
    const current = stream.current;
    stream.current = null;
    current?.getTracks().forEach((track) => {
      track.onended = null;
      track.stop();
    });
  }, []);
  const stopCamera = useCallback(() => {
    invalidateRequest();
    stopTracks();
    setMode("demo");
    setMessage("");
  }, [invalidateRequest, stopTracks]);

  useEffect(() => {
    const hidden = () => {
      if (document.hidden) stopCamera();
    };
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("pagehide", stopCamera);
    return () => {
      invalidateRequest();
      stopTracks();
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("pagehide", stopCamera);
    };
  }, [invalidateRequest, stopCamera, stopTracks]);

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
          stopCamera();
          setMessage("Не удалось показать камеру. Попробуйте ещё раз.");
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
  }, [mode, demoPaused, stopCamera]);

  const activateCamera = async () => {
    if (mode !== "demo") {
      stopCamera();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage(
        "Камера недоступна в этом браузере. Можно посмотреть демонстрацию.",
      );
      return;
    }
    const id = ++requestId.current;
    setMode("requesting");
    setMessage("");
    try {
      const camera = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      if (requestId.current !== id || document.hidden) {
        camera.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = camera;
      camera.getVideoTracks().forEach((track) => {
        track.onended = stopCamera;
      });
      setMode("live");
    } catch (error) {
      if (requestId.current !== id) return;
      setMode("demo");
      const name = error instanceof Error ? error.name : "";
      setMessage(
        name === "NotAllowedError"
          ? "Доступ к камере не разрешён. Демонстрация продолжает работать."
          : "Камера недоступна. Демонстрация продолжает работать.",
      );
    }
  };

  const down = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest("button"))
      return;
    const bounds = event.currentTarget.getBoundingClientRect();
    pointer.current = {
      id: event.pointerId,
      start: { x: event.clientX, y: event.clientY },
      origin: { x: bounds.x, y: bounds.y },
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.focus({ preventScroll: true });
    setDragging(true);
  };
  const move = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = pointer.current;
    if (!current || current.id !== event.pointerId) return;
    const dx = event.clientX - current.start.x,
      dy = event.clientY - current.start.y;
    if (Math.abs(dx) + Math.abs(dy) < 3) return;
    setPosition(clamp({ x: current.origin.x + dx, y: current.origin.y + dy }));
    setMoved(true);
    movedRef.current = true;
  };
  const up = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointer.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <>
      <div className="kruzhok-camera-anchor" ref={anchor} aria-hidden="true" />
      <div className="kruzhok-camera-actions">
        <button
          className="kruzhok-camera-toggle"
          type="button"
          onClick={() => void activateCamera()}
        >
          {mode === "live"
            ? "Выключить камеру"
            : mode === "requesting"
              ? "Отменить подключение"
              : "Включить мою камеру"}
        </button>
        <p className="kruzhok-camera-status" role="status">
          {message ||
            (mode === "requesting"
              ? "Разрешите доступ в окне браузера."
              : "Изображение останется в вашем браузере.")}
        </p>
      </div>
      <div
        className={`kruzhok-camera-orb${dragging ? " is-dragging" : ""}${mode === "live" ? " is-live" : ""}`}
        ref={orb}
        role="group"
        tabIndex={0}
        aria-label="Кружок с видео"
        aria-describedby="kruzhok-drag-help"
        style={position ? { left: position.x, top: position.y } : undefined}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onLostPointerCapture={() => {
          pointer.current = null;
          setDragging(false);
        }}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
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
            setMoved(true);
            movedRef.current = true;
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
              mode === "live"
                ? "Ваша камера"
                : "Демонстрационное видео Леонида Макарова"
            }
          />
        </div>
        {!moved && (
          <span className="kruzhok-orb-hint" aria-hidden="true">
            Можно перетаскивать
          </span>
        )}
        <div className="kruzhok-orb-controls">
          {mode !== "live" && (
            <button
              type="button"
              aria-label={
                demoPaused
                  ? "Воспроизвести демонстрацию"
                  : "Приостановить демонстрацию"
              }
              onClick={() => {
                setPlaybackBlocked(false);
                setPausedByUser(!demoPaused);
              }}
            >
              {demoPaused ? "Пуск" : "Пауза"}
            </button>
          )}
          <button
            type="button"
            onClick={reset}
            aria-label="Вернуть кружок на место"
          >
            На место
          </button>
        </div>
      </div>
      <span id="kruzhok-drag-help" className="visually-hidden">
        Перетаскивайте кружок мышью или пальцем. С клавиатуры используйте
        стрелки, Home возвращает кружок на место.
      </span>
    </>
  );
}
