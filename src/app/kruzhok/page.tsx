import Link from "next/link";
import { BrandMark } from "@/components/icons";
import { CameraDemo } from "@/components/kruzhok/camera-demo";
import { DownloadPicker } from "@/components/kruzhok/download-picker";
import { kruzhokRelease, pageMetadata } from "@/content/site";
import "./kruzhok.css";

export const metadata = pageMetadata(
  "Кружок — камера поверх окон",
  "Камера поверх окон для видеообъяснений. Попробуйте перетащить кружок, включите свою камеру и скачайте приложение для Mac или Windows.",
  "/kruzhok",
);
export default function Kruzhok() {
  return (
    <main id="main" className="kruzhok-landing">
      <header className="kruzhok-topbar">
        <Link
          href="/"
          className="kruzhok-home"
          aria-label="Ленинблок — главная"
        >
          <BrandMark />
          <span>ленинблок.</span>
        </Link>
      </header>
      <section className="kruzhok-hero" aria-labelledby="kruzhok-title">
        <CameraDemo />
        <h1 id="kruzhok-title">Кружок</h1>
        <p className="kruzhok-tagline">
          Камера поверх окон.
          <br />
          Для видеообъяснений.
        </p>
        <DownloadPicker />
      </section>
      <footer className="kruzhok-bottom">
        <details className="kruzhok-installation">
          <summary>Установка</summary>
          <div className="kruzhok-installation-panel">
            <h2>Установка Кружка</h2>
            <p>
              <strong>Mac.</strong> Один DMG подходит для Apple Silicon и Intel.
              Откройте его и перетащите Кружок в «Программы».
            </p>
            <p>
              <strong>Windows x64.</strong> Запустите EXE-установщик.
            </p>
            <p>
              При первом запуске разрешите доступ к камере. Экран и звук
              записывайте в привычной программе.
            </p>
            <p>
              Версия {kruzhokRelease.version} без подписи издателя: система
              может предупредить или заблокировать запуск. На Mac после попытки
              запуска откройте «Системные настройки» → «Конфиденциальность и
              безопасность». Если доверяете приложению, используйте «Всё равно
              открыть».{" "}
              <a href="https://support.apple.com/ru-ru/102445">
                Инструкция Apple
              </a>
              . На Windows возможно предупреждение SmartScreen.
            </p>
            <div className="kruzhok-installation-links">
              <a href={kruzhokRelease.url}>Все файлы релиза</a>
              <a href={kruzhokRelease.checksumsUrl}>Контрольные суммы</a>
            </div>
          </div>
        </details>
        <a href="https://github.com/leninblok/floating-camera">GitHub</a>
        <Link href="/">Леонид Макаров</Link>
      </footer>
    </main>
  );
}
