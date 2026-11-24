"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type NativeState = {
  shapeMode: "circle" | "rectangle";
  aspectRatio: "1:1" | "4:5" | "9:16";
  sizePresetId: string;
  borderEnabled: boolean;
  shadowEnabled: boolean;
  mirrorEnabled: boolean;
  focusEnabled: boolean;
  cameraDeviceId: string | null;
  sizes: { id: string; label: string; scale: number }[];
  cameraDevices: { id: string; label: string }[];
  cameraPending: boolean;
  message: string;
};
const initial: NativeState = {
  shapeMode: "rectangle",
  aspectRatio: "9:16",
  sizePresetId: "large",
  borderEnabled: false,
  shadowEnabled: true,
  mirrorEnabled: false,
  focusEnabled: false,
  cameraDeviceId: null,
  sizes: [
    { id: "compact", label: "Компактный", scale: 0.38 },
    { id: "normal", label: "Обычный", scale: 0.58 },
    { id: "large", label: "Большой", scale: 0.78 },
  ],
  cameraDevices: [],
  cameraPending: false,
  message: "",
};

export function CameraDemo({ children }: { children: ReactNode }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const source = useRef<HTMLSelectElement>(null);
  const dispose = useRef<(() => void) | undefined>(undefined);
  const [ready, setReady] = useState(false);
  const [state, setState] = useState(initial);
  const [privacy, setPrivacy] = useState("");
  const action = useCallback(
    (action: string, value: string | boolean | null) => {
      frame.current?.contentWindow?.postMessage(
        { kruzhok: true, action, value },
        location.origin,
      );
    },
    [],
  );

  useLayoutEffect(() => {
    const receive = (event: MessageEvent) => {
      if (
        event.source !== frame.current?.contentWindow ||
        event.origin !== location.origin ||
        !event.data?.kruzhok
      )
        return;
      if (event.data.type === "state") setState(event.data.value);
      if (event.data.type === "ready") setReady(true);
      if (event.data.type === "privacy") {
        setPrivacy(event.data.value);
        source.current?.focus();
      }
    };
    window.addEventListener("message", receive);
    root.current?.style.setProperty(
      "--display-height",
      `${screen.availHeight || innerHeight}px`,
    );
    if (frame.current) frame.current.src = "/kruzhok/runtime/index.html";
    return () => {
      window.removeEventListener("message", receive);
      dispose.current?.();
    };
  }, []);

  const choices = (
    label: string,
    current: string,
    items: readonly { value: string; label: string }[],
    event: string,
  ) => (
    <fieldset className="kruzhok-parameter" disabled={!ready}>
      <legend>{label}</legend>
      <div className="kruzhok-options">
        {items.map((item) => (
          <label key={item.value}>
            <input
              type="radio"
              name={event}
              value={item.value}
              checked={current === item.value}
              onChange={() => action(event, item.value)}
            />
            <span>{item.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
  const toggle = (label: string, checked: boolean, name: string) => (
    <label className="kruzhok-toggle">
      <input
        type="checkbox"
        checked={checked}
        disabled={!ready}
        onChange={(event) => action(name, event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );

  return (
    <div className="kruzhok-demo" ref={root}>
      <div
        className="kruzhok-preview-surface"
        aria-label="Демонстрация приложения"
      >
        <iframe
          ref={frame}
          title="Рабочее окно Кружка"
          className="kruzhok-app-window"
          allow="camera 'self'"
          onLoad={() => {
            const app = frame.current?.contentWindow as
              (Window & { disposeKruzhokDemo?: () => void }) | null;
            if (app?.disposeKruzhokDemo)
              dispose.current = app.disposeKruzhokDemo;
          }}
        />
      </div>
      <section className="kruzhok-intro" aria-labelledby="kruzhok-title">
        {children}
      </section>
      <section
        className="kruzhok-settings"
        aria-labelledby="kruzhok-settings-title"
      >
        <h2 id="kruzhok-settings-title">Параметры</h2>
        <div className="kruzhok-parameter">
          <label htmlFor="kruzhok-source">Выбрать камеру</label>
          <div className="kruzhok-select">
            <select
              id="kruzhok-source"
              ref={source}
              disabled={!ready}
              value={state.cameraDeviceId ?? ""}
              onChange={(event) => {
                setPrivacy("");
                action("source", event.target.value || null);
              }}
            >
              <option value="">Автоматически</option>
              {state.cameraDevices
                .filter((device) => device.id !== "demo-leonid")
                .map((device) => (
                  <option key={device.id} value={device.id}>
                    {device.label}
                  </option>
                ))}
              <option value="demo-leonid">Видео Леонида</option>
            </select>
          </div>
          {(state.message || privacy) && (
            <p className="kruzhok-source-message" role="status">
              {privacy || state.message}
            </p>
          )}
        </div>
        {choices(
          "Форма",
          state.shapeMode,
          [
            { value: "circle", label: "Круг" },
            { value: "rectangle", label: "Прямоугольник" },
          ],
          "shape",
        )}
        {state.shapeMode === "rectangle" &&
          choices(
            "Соотношение сторон",
            state.aspectRatio,
            ["1:1", "4:5", "9:16"].map((value) => ({ value, label: value })),
            "aspect",
          )}
        {choices(
          "Размер",
          state.sizePresetId,
          state.sizes.map((item) => ({ value: item.id, label: item.label })),
          "size",
        )}
        <fieldset className="kruzhok-parameter" disabled={!ready}>
          <legend>Оформление</legend>
          <div className="kruzhok-toggles">
            {toggle("Контур", state.borderEnabled, "border")}
            {toggle("Тень", state.shadowEnabled, "shadow")}
          </div>
        </fieldset>
        <div className="kruzhok-parameter">
          {toggle("Отразить по горизонтали", state.mirrorEnabled, "mirror")}
        </div>
        <div className="kruzhok-parameter">
          {toggle("Фокус", state.focusEnabled, "focus")}
        </div>
      </section>
    </div>
  );
}
