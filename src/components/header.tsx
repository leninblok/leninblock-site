import Link from "next/link";
import { BrandMark } from "./icons";
export function Header() {
  return (
    <header className="site-header wrap">
      <Link href="/" className="brand" aria-label="Ленинблок — главная">
        <BrandMark />
        <span>
          ленинблок<span className="brand-dot">.</span>
        </span>
      </Link>
      <nav aria-label="Проекты">
        <Link href="/kruzhok">Кружок</Link>
        <Link href="/bible">Откуда из Библии?</Link>
      </nav>
    </header>
  );
}
