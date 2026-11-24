import { CameraDemo } from "@/components/kruzhok/camera-demo";
import { DownloadPicker } from "@/components/kruzhok/download-picker";
import { pageMetadata } from "@/content/site";
import "./kruzhok.css";

export const metadata = pageMetadata(
  "Кружок — камера поверх окон",
  "Камера поверх окон: показывайте себя, пока делитесь экраном. Скачать для Mac или Windows.",
  "/kruzhok",
);
export default function Kruzhok() {
  return (
    <main id="main" className="kruzhok-landing">
      <CameraDemo>
        <h1 id="kruzhok-title">Кружок</h1>
        <p className="kruzhok-tagline">Камера поверх окон.<br />Показывайте себя, пока делитесь экраном.</p>
        <DownloadPicker />
      </CameraDemo>
    </main>
  );
}
