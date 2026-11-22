import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { siteUrl } from "@/content/site";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Ленинблок — Леонид Макаров", template: "%s · Ленинблок" },
  applicationName: "Ленинблок",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>
        <a className="skip-link" href="#main">
          К содержимому
        </a>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
