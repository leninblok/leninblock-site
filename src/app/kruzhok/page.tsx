import Link from "next/link";
import { BrandMark } from "@/components/icons";
import { CameraDemo } from "@/components/kruzhok/camera-demo";
import { DownloadPicker } from "@/components/kruzhok/download-picker";
import { pageMetadata } from "@/content/site";
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
      <CameraDemo>
        <h1 id="kruzhok-title">Кружок</h1>
        <p className="kruzhok-tagline">
          Камера поверх окон.
          <br />
          Для видеообъяснений.
        </p>
        <DownloadPicker />
      </CameraDemo>
    </main>
  );
}
