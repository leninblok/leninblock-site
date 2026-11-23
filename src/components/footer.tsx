"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Arrow } from "./icons";
export function Footer() {
  const pathname = usePathname();
  if (pathname === "/kruzhok") return null;
  return (
    <footer className="site-footer wrap">
      <Link href="/">Леонид Макаров</Link>
      <p>Интерфейсы и работающие продукты</p>
      <a className="text-link" href="https://github.com/leninblok">
        GitHub <Arrow external />
      </a>
      <span>© 2026</span>
    </footer>
  );
}
