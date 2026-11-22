import Link from "next/link";
import { Arrow } from "@/components/icons";
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
        <p className="eyebrow">
          <span className="small-square" />
          Леонид Макаров · продуктовый дизайнер
        </p>
        <h1 id="intro-title">
          Проектирую интерфейсы.
          <br />
          <span>
            Собираю работающие
            <br className="desktop-break" /> продукты.
          </span>
        </h1>
        <p className="intro-note">
          От идеи и первых экранов — до продукта,
          <br className="desktop-break" /> которым можно пользоваться.
        </p>
      </section>
      <section className="projects" aria-labelledby="projects-title">
        <div className="section-heading">
          <h2 id="projects-title">Мои продукты</h2>
          <span className="count">01 — 02</span>
        </div>
        <div className="project-grid">
          <Link className="project-card camera-card" href="/kruzhok">
            <div className="card-art camera-art" aria-hidden="true">
              <span className="art-label">КАМЕРА ПОВЕРХ ОКОН</span>
              <div className="camera-word">
                Кружок
                <span className="camera-ring" />
              </div>
              <span className="art-bottom">
                Вы — в кадре.
                <br />
                Работа — на экране.
              </span>
              <span className="art-index">01</span>
            </div>
            <div className="card-info">
              <div>
                <h3>Кружок</h3>
                <p>Камера поверх окон для видеообъяснений.</p>
              </div>
              <span className="round-arrow">
                <Arrow />
              </span>
            </div>
            <div className="card-meta">
              <span>Приложение для компьютера</span>
              <span>Познакомиться</span>
            </div>
          </Link>
          <Link className="project-card bible-card" href="/bible">
            <div className="card-art bible-art" aria-hidden="true">
              <span className="art-label">ИГРА В БРАУЗЕРЕ</span>
              <div className="bible-word">
                Откуда
                <br />
                <span>из Библии?</span>
              </div>
              <span className="book-line" />
              <span className="art-bottom">
                Один стих.
                <br />
                Где его место?
              </span>
              <span className="art-index">02</span>
            </div>
            <div className="card-info">
              <div>
                <h3>Откуда из Библии?</h3>
                <p>Угадайте, где в Библии находится стих.</p>
              </div>
              <span className="round-arrow">
                <Arrow />
              </span>
            </div>
            <div className="card-meta">
              <span>Игра на отдельном сайте</span>
              <span>Об игре</span>
            </div>
          </Link>
        </div>
      </section>
      <div className="home-end">
        <span className="small-square" />
        <p>
          Дизайн становится интереснее,
          <br />
          когда начинает работать.
        </p>
      </div>
    </main>
  );
}
