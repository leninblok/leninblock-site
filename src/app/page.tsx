import Link from "next/link";
import { pageMetadata } from "@/content/site";

export const metadata = pageMetadata(
  "Леонид Макаров — интерфейсы и продукты",
  "Проектирую интерфейсы и собираю работающие продукты. Кружок — камера поверх окон. Откуда из Библии? — игра о библейских стихах.",
  "/",
);

export default function Home() {
  return (
    <main id="main" className="wrap home">
      <section className="intro" aria-labelledby="intro-title">
        <p className="eyebrow">Леонид Макаров · продуктовый дизайнер</p>
        <h1 id="intro-title">Проектирую интерфейсы.<br />Собираю продукты.</h1>
        <div className="intro-aside"><p className="intro-note">От идеи и первых экранов — до продукта, которым можно пользоваться.</p><a className="intro-link" href="#projects-title">Смотреть продукты</a></div>
      </section>
      <section className="projects" aria-labelledby="projects-title">
        <div className="section-heading"><h2 id="projects-title">Мои продукты</h2></div>
        <div className="project-grid">
          <Link className="project-card camera-card" href="/kruzhok">
            <span className="project-kind">Приложение для компьютера</span>
            <div className="project-name"><h3>Кружок</h3><span aria-hidden="true">↗</span></div>
            <p>Камера поверх окон для видеообъяснений.</p>
          </Link>
          <Link className="project-card bible-card" href="/bible">
            <span className="project-kind">Игра в браузере</span>
            <div className="project-name"><h3>Откуда<br />из Библии?</h3><span aria-hidden="true">↗</span></div>
            <p>Угадайте, где в Библии находится стих.</p>
          </Link>
        </div>
      </section>
    </main>
  );
}
