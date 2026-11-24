"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
export function Header() {
  const pathname = usePathname();
  if (pathname === "/kruzhok") return null;
  return (
    <header className="site-header wrap">
      <Link href="/" className="brand" aria-label="Лёня Макаров — главная">
        <span>Лёня Макаров<span className="brand-dot">.</span></span>
      </Link>
      <nav aria-label="Проекты">
        <Link href="/kruzhok">Кружок</Link>
        <Link href="/bible">Откуда из Библии?</Link>
      </nav>
    </header>
  );
}
