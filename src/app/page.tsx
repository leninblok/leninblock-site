import Link from "next/link";
import Image from "next/image";
import { Pigeon } from "@/components/pigeon";
import { gameUrl, pageMetadata } from "@/content/site";
import "./portfolio.css";

export const metadata = pageMetadata(
  "Лёня Макаров — продуктовый дизайнер",
  "Портфолио Лёни Макарова: Кружок — камера поверх окон и игра «Откуда из Библии?».",
  "/",
);

export default function Home() {
  return (
    <main id="main" className="portfolio">
      <section className="portfolio-intro" aria-labelledby="intro-title">
        <div className="portfolio-intro-copy">
          <p className="portfolio-overline">Портфолио · продуктовый дизайн</p>
          <h1 id="intro-title" aria-label="Привет, я Лёня.">Привет,<span className="intro-name">я Л<span className="yo">е<span className="yo-birds"><Pigeon /><Pigeon flip /></span></span>ня.</span></h1>
          <p className="portfolio-lead">Я продуктовый дизайнер. Проектирую сложные интерфейсы и собираю работающие продукты.</p>
          <p className="portfolio-experience">Работал дизайнером продуктов в Антифишинге и коммуникационным дизайнером в ФТ Онлайн. Исследую задачи, проектирую интерфейсы, работаю с дизайн-системами и кодом.</p>
          <div className="portfolio-intro-links"><a className="portfolio-text-link" href="#projects">Посмотреть проекты <span aria-hidden="true">↓</span></a><a className="portfolio-text-link" href="https://t.me/kidneppil">Telegram</a><a className="portfolio-text-link" href="mailto:l_e_makarov@mail.ru">Почта</a></div>
        </div>
        <div className="portfolio-portrait">
          <Image src="/kruzhok/intro-poster.jpg" width={640} height={640} alt="Лёня Макаров" priority />
        </div>
      </section>
      <section className="portfolio-project portfolio-camera" id="projects" aria-labelledby="camera-project-title">
        <div className="portfolio-project-copy">
          <p className="portfolio-overline">Приложение для Mac и Windows</p>
          <h2 id="camera-project-title">Кружок<span className="project-dot">.</span></h2>
          <p className="portfolio-project-lead">Камера поверх окон для видеообъяснений.</p>
          <p className="portfolio-description">Перетащи изображение в удобное место, выбери форму и размер — и показывай себя вместе с тем, что происходит на экране.</p>
          <Link className="portfolio-button" href="/kruzhok">Попробовать Кружок</Link>
        </div>
        <div className="portfolio-camera-demo" role="img" aria-label="Пример изображения камеры в Кружке">
          <div className="portfolio-camera-window"><video autoPlay muted loop playsInline controls aria-label="Демонстрационное видео Кружка" poster="/kruzhok/intro-poster.jpg"><source src="/kruzhok/intro.mp4" type="video/mp4" /></video></div>
        </div>
      </section>
      <section className="portfolio-project portfolio-bible" aria-labelledby="bible-project-title">
        <div className="portfolio-project-copy">
          <p className="portfolio-overline">Игра в браузере</p>
          <h2 id="bible-project-title">Откуда<br /><em>из Библии?</em></h2>
          <p className="portfolio-project-lead">Один стих. Где его место?</p>
          <p className="portfolio-description">Прочитай стих и попробуй угадать книгу, главу и номер. Игра покажет правильный ответ и расстояние до него.</p>
          <div className="portfolio-actions"><a className="portfolio-button" href={gameUrl}>Играть</a><Link className="portfolio-text-link" href="/bible">Об игре</Link></div>
        </div>
        <div className="portfolio-bible-art" aria-hidden="true"><Pigeon className="portfolio-pigeon" /><span>?</span></div>
      </section>
    </main>
  );
}
