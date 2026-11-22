# Ленинблок

Сайт продуктов Леонида Макарова для `https://leninblock.ru`. Репозиторий: [leninblok/leninblock-site](https://github.com/leninblok/leninblock-site). Next.js App Router, TypeScript, обычный CSS. Без CMS, базы данных, аналитики и секретов.

## Маршруты

| Путь | Содержимое |
| --- | --- |
| `/` | Автор и ссылки на два продукта |
| `/kruzhok` | Возможности приложения и честный статус скачивания |
| `/bible` | Знакомство с игрой, кнопка перехода на её отдельный сайт |
| `/play` | HTTP 307 на `https://www.wherefrombible.ru/` |
| `/sitemap.xml`, `/robots.txt` | Индексация трёх страниц |

Неизвестные адреса, включая `/easm` и `/work`, возвращают 404. `www.leninblock.ru` перенаправляется на основной домен с HTTP 308; это правило сработает после подключения обоих доменов к хостингу.

## Локальная работа

Node.js 20.9+ (для нового хостинга используйте поддерживаемую LTS-версию, например Node.js 24).

```bash
npm ci
npm run dev
```

Открыть http://localhost:3000.

```bash
npm run lint
npm run build
npm run typecheck
npm run start
```

Проверка браузером (после production build):

```bash
npx playwright install chromium
npm run test:e2e
```

Тесты сами запускают production-сервер. Проверяют HTTP-статусы, редиректы, метаданные и OG-изображения, ссылки, 404, отсутствие горизонтального скролла на 320/390/768/1440 px, WCAG A/AA через axe на мобильной и десктопной ширине, переход с клавиатуры и ошибки консоли.

Можно указать `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` для существующего Chromium. `TEST_BASE_URL=https://... npm run test:e2e` запускает проверки на внешнем сервере; проверка Host-редиректа рассчитана на локальный сервер и на чужом хостинге может блокироваться платформой.

## Обновление контента

- Тексты: `src/app/page.tsx`, `src/app/kruzhok/page.tsx`, `src/app/bible/page.tsx`.
- Адреса, метаданные и список скачиваний: `src/content/site.ts`.
- Цвета, сетка, адаптивность: `src/app/globals.css`.
- Общая навигация: `src/components/header.tsx`, `footer.tsx`.
- Медиа: `public/`. Для скриншотов используйте `next/image`, размеры и содержательный alt. Видео — с controls, poster и preload="none"; без обязательного автозапуска.
- Команда `npm run assets` пересоздаёт типографические PNG и favicon через Sharp (на macOS с Arial). Готовые изображения уже включены в Git; серверу этот шаг не нужен.
- Индивидуальные изображения для социальных сетей: `public/og/*.png`, 1200×630. При изменении позиционирования обновите изображение и метаданные вместе.

Обложки — самостоятельная типографическая графика. Они не изображают интерфейсы. Реальные демонстрации продуктов остаются задачей: см. [источники контента](docs/CONTENT_SOURCES.md).

## Скачивание Кружка

Репозиторий `leninblok/floating-camera` открыт владельцем. На `/kruzhok` есть три прямые ссылки на публичные файлы релиза v1.1.0: Mac Apple Silicon (DMG, 124 МБ), Mac Intel (DMG, 128 МБ), Windows x64 (EXE, 123 МБ). Регистрация и вход в GitHub не нужны.

Ссылки, размеры и версия заданы в `src/content/site.ts`. Используются URL конкретного релиза: имена файлов содержат номер версии, поэтому `latest/download` с придуманным стабильным именем не используется.

При обновлении:

1. Опубликовать реальные установщики и SHA256SUMS в новом GitHub Release.
2. Проверить анонимный доступ, соответствие ОС/архитектуры, контрольные суммы и установку на целевых системах.
3. Обновить `kruzhokRelease` и `kruzhokDownloads`, размеры, инструкции и тест ожидаемых URL.
4. Повторить lint, build и браузерные проверки; push в main запустит Vercel.

Текущий релиз заявлен как неподписанный. Страница содержит инструкции установки и предупреждения macOS/Windows, ссылку на Apple, релиз и SHA-256. Проверка ссылки не означает подтверждение безопасности или ручной проверки приложения на всех ОС.

Установщики хранятся в GitHub Releases, а не в репозитории сайта. Токены и сервер-посредник для скачивания не нужны.

## GitHub, Vercel и домен

Фактический итог публикации и блокеры — в [DEPLOYMENT.md](docs/DEPLOYMENT.md).

Для новой публикации из авторизованной сессии:

```bash
gh auth status
gh api user --jq .login
# Только если репозитория ещё нет:
gh repo create leninblok/leninblock-site --public --source=. --remote=origin --push
npx vercel login
```

В Vercel: **Add New → Project → Import Git Repository → leninblok/leninblock-site**. Перед созданием убедиться, что существующий проект с доменом не занят другим сайтом. Framework: Next.js, Root Directory: `./`, Build: `npm run build`, Node.js: 24.x, Production Branch: `main`. Git-интеграция создаёт production из main и preview из PR. Базовой версии переменные окружения не нужны.

После успешного деплоя: **Project → Settings → Domains → Add Domain** для `leninblock.ru` и `www.leninblock.ru`. Основной адрес — без www, www — redirect. Vercel покажет записи именно этого проекта. У регистратора в разделе DNS внесите эти значения, не меняя NS, MX и почтовые TXT. Не используйте произвольный IP из старых инструкций. Дождитесь статуса Valid Configuration и сертификата, проверьте HTTPS и все маршруты.

Справочники: [DNS Vercel](https://vercel.com/docs/domains/set-up-custom-domain), [Next.js redirects](https://nextjs.org/docs/app/guides/redirecting), [метаданные](https://nextjs.org/docs/app/getting-started/metadata-and-og-images), [GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github/linking-to-releases).

## Новый продукт или кейс

Создайте `src/app/<slug>/page.tsx`, задайте индивидуальные title/description/canonical через `pageMetadata`, добавьте PNG social-preview, карточку на главную и URL в sitemap. Добавляйте в навигацию только страницы с готовым содержимым. Для EASM нужны разрешённые материалы и точное описание: проект не был внедрён, его нельзя представлять как запущенную функцию.

Не переносите сюда исходники «Кружка» и игры. Контакты и частные рабочие материалы публикуйте только после разрешения владельца.
