import Link from "next/link";
import { Arrow } from "@/components/icons";
import { kruzhokDownloads, pageMetadata } from "@/content/site";
export const metadata = pageMetadata(
  "Кружок — камера поверх окон",
  "Покажите себя рядом с работой на экране. Кружок выводит камеру поверх окон, а запись вы ведёте в привычной программе.",
  "/kruzhok",
);
export default function Kruzhok() {
  return (
    <main id="main" className="wrap product camera-product">
      <Link className="back-link" href="/">
        ← Все продукты
      </Link>
      <section className="product-hero" aria-labelledby="product-title">
        <div className="product-heading">
          <p className="eyebrow">Приложение для компьютера</p>
          <h1 id="product-title">
            Кружок<span className="accent">.</span>
          </h1>
          <p className="product-lead">
            Камера поверх окон
            <br />
            для видеообъяснений.
          </p>
          <p className="body-copy">
            Показывайте макет, разбирайте код или объясняйте задачу. Кружок
            оставит вас в кадре рядом с тем, о чём вы говорите.
          </p>
          <a className="button button-dark" href="#download">
            О скачивании <Arrow />
          </a>
          <p className="fine-print">
            Для macOS и Windows · запись во внешней программе
          </p>
        </div>
        <div className="product-poster camera-poster" aria-hidden="true">
          <span className="art-label">КРУЖОК</span>
          <span className="poster-circle" />
          <p>
            Вы — в кадре.
            <br />
            Работа —<br />
            на экране.
          </p>
          <span className="poster-note">
            Камера рядом с тем,
            <br />
            что вы показываете.
          </span>
        </div>
      </section>
      <section className="product-section" aria-labelledby="features-title">
        <div className="section-heading">
          <h2 id="features-title">В кадре — как вам удобно</h2>
          <span className="section-note">Без лишних окон</span>
        </div>
        <div className="feature-grid">
          <article>
            <span className="feature-number">01</span>
            <h3>Поверх вашей работы</h3>
            <p>
              Перетащите окно камеры в удобное место, в том числе на другой
              монитор. Остальные приложения остаются под ним.
            </p>
          </article>
          <article>
            <span className="feature-number">02</span>
            <h3>Нужная форма и размер</h3>
            <p>
              Выберите круг или прямоугольник с пропорциями 1:1, 4:5 или 9:16.
              Настройте размер, тень, контур и отражение.
            </p>
          </article>
          <article>
            <span className="feature-number">03</span>
            <h3>Ближе, когда нужно</h3>
            <p>
              Двойной клик увеличивает изображение и переносит его в центр
              экрана. Ещё один — возвращает обратно.
            </p>
          </article>
        </div>
      </section>
      <section
        className="split-section product-section"
        aria-labelledby="start-title"
      >
        <div>
          <p className="eyebrow">Как это работает</p>
          <h2 id="start-title">
            Камера — в Кружке.
            <br />
            Запись — как привыкли.
          </h2>
          <p className="body-copy">
            Кружок показывает изображение с камеры. Экран и звук записывает
            выбранная вами программа.
          </p>
        </div>
        <ol className="steps">
          <li>
            <span>1</span>
            <div>
              <h3>Откройте приложение</h3>
              <p>При первом запуске разрешите доступ к камере.</p>
            </div>
          </li>
          <li>
            <span>2</span>
            <div>
              <h3>Расположите камеру</h3>
              <p>
                Перетащите её в нужное место. Правый клик открывает настройки
                камеры и оформления.
              </p>
            </div>
          </li>
          <li>
            <span>3</span>
            <div>
              <h3>Начните запись экрана</h3>
              <p>
                Записывайте в привычной программе. Кружок сохранит положение и
                настройки для следующего запуска.
              </p>
            </div>
          </li>
        </ol>
      </section>
      <section
        id="download"
        className="download-panel"
        aria-labelledby="download-title"
      >
        <p className="eyebrow">Скачивание</p>
        <h2 id="download-title">
          {kruzhokDownloads.length
            ? "Выберите вашу версию"
            : "Версия для скачивания готовится"}
        </h2>
        {kruzhokDownloads.length ? (
          <div className="download-options">
            {kruzhokDownloads.map((download) => (
              <a
                className="button button-dark"
                key={download.url}
                href={download.url}
              >
                {download.label}
                <span>{download.detail}</span>
                <Arrow external />
              </a>
            ))}
          </div>
        ) : (
          <p>
            Кружок рассчитан на macOS и Windows. Установщики пока недоступны для
            публичного скачивания. Когда они будут готовы к распространению,
            ссылки появятся здесь.
          </p>
        )}
      </section>
      <aside className="product-outro">
        <p>Кружок — продукт Леонида Макарова.</p>
        <Link className="text-link" href="/bible">
          Другой проект: Откуда из Библии? <Arrow />
        </Link>
      </aside>
    </main>
  );
}
