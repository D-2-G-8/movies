# Nightwave

Локальный MVP личного кинотеатра в формате линейного ТВ. Пользователь выбирает не фильм, а тематический канал — сервер сам решает, что сейчас показывать, и вставляет между фильмами трейлеры или короткие ролики.

## Что уже работает

- тёмная главная без каталога и постеров, с live-карточками каналов;
- отдельный экран просмотра с настоящим HTML5-видеоплеером;
- автоматический переход к следующему элементу после `ended` и ручная кнопка skip;
- краткая карточка текущей программы по кнопке `i`;
- ordered и weighted random режимы;
- repeat window для фильмов и вставок с безопасным fallback, если выборка пуста;
- несколько трейлеров/рекламных роликов между фильмами;
- Studio (`/admin`) для каналов, контента, источников и вставок;
- SQLite, seed и полная история воспроизведения;
- public API и отдельный admin namespace `/api/internal/...`.

## Стек

- Next.js 16, App Router, TypeScript;
- React 19;
- Prisma 6;
- SQLite;
- Lucide Icons;
- обычный CSS без UI-фреймворка.

## Быстрый запуск

Требуется Node.js 20.9+ (проект проверен на Node.js 24).

```bash
cd /Users/dariagritsienko/pet-projects/movies
npm install
cp .env.example .env
npx prisma db push
npm run db:seed
npm run dev
```

После запуска:

- кинотеатр: [http://localhost:3000](http://localhost:3000)
- Studio: [http://localhost:3000/admin](http://localhost:3000/admin)

Production-проверка:

```bash
npm run lint
npm run build
npm start
```

## База данных и seed

Строка подключения лежит в `.env`:

```dotenv
DATABASE_URL="file:./dev.db"
```

SQLite-файл создаётся как `prisma/dev.db` и не коммитится. Команды:

```bash
npm run db:push    # применить schema.prisma без миграций
npm run db:seed    # пересоздать демонстрационные данные
npm run db:studio  # открыть Prisma Studio
```

Seed создаёт каналы Horror, Comedy TV и Cartoons, семь тестовых программ, прямые MP4-источники и три вставки. Повторный `npm run db:seed` очищает текущие локальные данные и возвращает демо-состояние.

## Архитектура

Проект намеренно сделан одним Next.js-приложением для быстрого локального запуска:

```text
src/app/
├── page.tsx                         # клиент: список каналов
├── channel/[id]/page.tsx            # клиент: просмотр канала
├── admin/page.tsx                   # Studio
└── api/
    ├── channels/...                 # public API
    └── internal/...                 # admin API

src/lib/
├── db.ts                            # singleton PrismaClient
├── playback.ts                      # scheduler / playback engine
└── providers/                       # слой источников

prisma/
├── schema.prisma
└── seed.ts
```

Основные сущности:

- `Channel` — настройки канала и правила воспроизведения;
- `Media` — фильм, сериал, серия или мультфильм;
- `MediaSource` — один из возможных источников конкретного `Media`;
- `ChannelMedia` — привязка контента к каналу, `position`, `weight`, `enabled`;
- `Ad` и `ChannelAd` — трейлеры/ролики и их привязки;
- `PlaybackHistory` — начатые и завершённые показы для repeat rules.

## Как работает playback engine

### Ordered

Контент сортируется по `ChannelMedia.position`. После последнего элемента очередь начинается сначала. Если repeat window исключает следующий элемент, движок идёт дальше по очереди; если исключены все элементы, ограничение временно ослабляется.

### Random

Из активного контента с рабочим источником вычитаются элементы, показанные за последние `repeatDays`. Затем выполняется случайный выбор с учётом `ChannelMedia.weight`. Если eligible-список пуст, движок выбирает из полного списка и не останавливает канал.

### Ads / Trailers

После фильма движок показывает до `interstitialCount` элементов. Флаги `useTrailers` и `useAds` управляют допустимыми типами, `interstitialMode` — их порядком, `interstitialRepeatDays` — окном повтора. После нужного количества вставок снова выбирается основной контент.

`GET /api/channels/:id/playback` возвращает текущий незавершённый показ либо создаёт первый. `POST /api/channels/:id/next` завершает текущий элемент, пишет историю и выбирает следующий.

## Источники видео

Контент и видеоисточник разделены. Один `Media` может иметь несколько `MediaSource`; выбирается активный источник с наибольшим `priority`.

Абстракция описана в `src/lib/providers/types.ts`:

```ts
interface MediaProvider {
  name: string;
  resolve(media: MediaWithSources): Promise<ResolvedSource[]>;
}
```

В MVP есть:

- `DirectUrlProvider` — прямой MP4/совместимый URL или iframe;
- `LocalProvider` — путь к локально раздаваемому файлу;
- `FutureExternalProvider` — пустая точка расширения для будущего провайдера.

Чтобы добавить провайдер:

1. Создайте реализацию `MediaProvider` в `src/lib/providers/`.
2. Добавьте её в массив `providers` в `src/lib/providers/index.ts`.
3. Создавайте источники с совпадающим значением `provider` через Studio или internal API.

MVP не обходит DRM, токены и защиты и не использует scraping. Seed содержит только публичные демонстрационные MP4.

## Работа через Studio

### Создать канал

1. Откройте `/admin`, раздел **Channels**.
2. Заполните блок **Create channel**.
3. В карточке канала настройте mode, repeat window и вставки.
4. В секции **Channel content** добавьте контент и задайте `position`.

### Добавить контент и source

1. В **Content** создайте Movie, Series, Episode или Cartoon.
2. Для Episode заполните series, season и episode.
3. В **Sources** выберите созданный контент, provider, URL и priority.
4. Вернитесь в **Channels** и добавьте контент в нужный канал.

### Добавить трейлер или рекламу

1. В **Ads / Trailers** создайте клип с прямым URL.
2. Назначьте его нужному каналу.
3. В настройках канала включите trailers и/или ads и задайте количество вставок.

## API

Public:

```text
GET  /api/channels
GET  /api/channels/:id
GET  /api/channels/:id/playback
GET  /api/channels/:id/now-playing
POST /api/channels/:id/next
```

Internal CRUD:

```text
/api/internal/channels
/api/internal/channels/:id/rules
/api/internal/channels/:id/media
/api/internal/channels/:id/ads
/api/internal/media
/api/internal/media/:id/sources
/api/internal/sources/:id
/api/internal/ads
```

Studio рассчитана на локальное использование, поэтому в MVP у `/api/internal` пока нет авторизации. Перед публикацией в сеть нужно добавить сессию администратора и проверку доступа.

## Ограничения MVP

- это логический линейный канал, а не серверный live-HLS и не транскодер;
- состояние текущего показа общее для канала и хранится в `PlaybackHistory`;
- длительность контента не синхронизируется с реальным таймкодом между несколькими клиентами;
- прямой URL должен поддерживаться браузером и разрешать воспроизведение с локальной страницы.
