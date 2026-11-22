import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="wrap not-found">
      <p className="eyebrow">404 · Страница не найдена</p>
      <h1>
        Кажется, здесь
        <br />
        ничего нет.
      </h1>
      <p>Вернитесь на главную — там все продукты.</p>
      <Link className="button button-dark" href="/">
        На главную →
      </Link>
    </main>
  );
}
