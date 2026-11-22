import Link from "next/link";
import { Arrow } from "@/components/icons";
import { gameUrl, pageMetadata } from "@/content/site";
export const metadata = pageMetadata(
  "Откуда из Библии? — игра о библейских стихах",
  "Угадайте, где в Библии находится стих. Познакомьтесь с игрой и перейдите на wherefrombible.ru.",
  "/bible",
);
export default function Bible() {
  return (
    <main id="main" className="wrap product bible-product">
      <Link className="back-link" href="/">
        ← Все продукты
      </Link>
      <section className="bible-hero" aria-labelledby="product-title">
        <p className="eyebrow">Игра в браузере</p>
        <h1 id="product-title">
          Откуда
          <br />
          <em>из Библии?</em>
        </h1>
        <p className="product-lead">Один стих. Где его место?</p>
        <p className="body-copy">
          Угадайте, где в Библии находится стих.
          <br className="desktop-break" /> Проверьте, насколько хорошо вы
          ориентируетесь в тексте.
        </p>
        <a className="button button-purple" href={gameUrl}>
          Играть <Arrow external />
        </a>
        <p className="fine-print">На отдельном сайте · wherefrombible.ru</p>
      </section>
      <section
        className="bible-explanation product-section"
        aria-labelledby="game-title"
      >
        <p className="eyebrow">Об игре</p>
        <h2 id="game-title">
          Знакомый текст.
          <br />
          Новый повод присмотреться.
        </h2>
        <p className="body-copy">
          Прочитайте стих и выберите книгу, главу и номер стиха. После ответа
          игра покажет правильное место и расстояние до него — в стихах.
        </p>
      </section>
      <div className="game-callout">
        <div>
          <h2>Проверим?</h2>
          <p>Откройте игру и попробуйте угадать первый стих.</p>
        </div>
        <a className="button button-purple" href={gameUrl}>
          Перейти к игре <Arrow external />
        </a>
      </div>
      <aside className="product-outro">
        <p>Один из продуктов Леонида Макарова.</p>
        <Link className="text-link" href="/kruzhok">
          Другой проект: Кружок <Arrow />
        </Link>
      </aside>
    </main>
  );
}
