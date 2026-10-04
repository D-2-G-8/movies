export type KinopoiskMedia = {
  kinopoiskId: string;
  kinopoiskUrl: string;
  type: "MOVIE" | "SERIES" | "CARTOON";
  title: string;
  originalTitle: string | null;
  year: number | null;
  description: string | null;
  posterUrl: string | null;
  durationSeconds: number;
  genres: string | null;
  countries: string | null;
  directors: string | null;
  cast: string | null;
  rating: number | null;
  ratingCount: number | null;
  ageRating: string | null;
};

type SchemaPerson = { name?: unknown };

type KinopoiskSchema = {
  "@type"?: unknown;
  name?: unknown;
  alternativeHeadline?: unknown;
  alternateName?: unknown;
  description?: unknown;
  image?: unknown;
  genre?: unknown;
  datePublished?: unknown;
  timeRequired?: unknown;
  contentRating?: unknown;
  countryOfOrigin?: unknown;
  director?: unknown;
  actor?: unknown;
  aggregateRating?: { ratingValue?: unknown; ratingCount?: unknown };
  video?: { duration?: unknown };
};

const KINOPOISK_HOSTS = new Set(["kinopoisk.ru", "www.kinopoisk.ru"]);
const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function number(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function list(value: unknown) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  const normalized = values.map(text).filter((item): item is string => Boolean(item));
  return normalized.length ? normalized.join(", ") : null;
}

function people(value: unknown) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  const names = values
    .map((item) => (item && typeof item === "object" ? text((item as SchemaPerson).name) : null))
    .filter((item): item is string => Boolean(item));
  return names.length ? names.join(", ") : null;
}

function durationSeconds(schema: KinopoiskSchema) {
  const minutes = number(schema.timeRequired);
  if (minutes !== null) return Math.max(1, Math.round(minutes * 60));

  const duration = text(schema.video?.duration);
  const match = duration?.match(/^T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return 300;
  return Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0);
}

function mediaType(schema: KinopoiskSchema, pathType: string) {
  const genres = (list(schema.genre) ?? "").toLocaleLowerCase("ru");
  if (genres.includes("мультфильм") || genres.includes("аниме")) return "CARTOON" as const;
  if (schema["@type"] === "TVSeries" || pathType === "series") return "SERIES" as const;
  return "MOVIE" as const;
}

export function parseKinopoiskUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Вставь корректную ссылку Кинопоиска");
  }

  const match = url.pathname.match(/^\/(film|series)\/(\d+)(?:\/|$)/);
  if (url.protocol !== "https:" || !KINOPOISK_HOSTS.has(url.hostname) || !match) {
    throw new Error("Поддерживаются только ссылки вида https://www.kinopoisk.ru/film/123456/");
  }

  return {
    id: match[2],
    pathType: match[1],
    url: `https://www.kinopoisk.ru/${match[1]}/${match[2]}/`,
  };
}

function extractMovieSchema(html: string) {
  const scripts = html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const match of scripts) {
    try {
      const schema = JSON.parse(match[1]) as KinopoiskSchema;
      if (schema["@type"] === "Movie" || schema["@type"] === "TVSeries") return schema;
    } catch {
      // На странице могут быть другие JSON-LD блоки; пропускаем повреждённые.
    }
  }
  throw new Error("Кинопоиск не вернул данные фильма. Попробуй ещё раз позже");
}

export async function readKinopoisk(value: string): Promise<KinopoiskMedia> {
  const parsed = parseKinopoiskUrl(value);
  const response = await fetch(parsed.url, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "ru-RU,ru;q=0.9",
      Cookie: "disable_server_sso_redirect=1",
      "User-Agent": USER_AGENT,
    },
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(response.status >= 300 && response.status < 400
      ? "Кинопоиск запросил дополнительную проверку. Попробуй ещё раз позже"
      : `Кинопоиск вернул ошибку ${response.status}`);
  }

  const schema = extractMovieSchema(await response.text());
  const title = text(schema.name);
  if (!title) throw new Error("Не удалось прочитать название с Кинопоиска");

  return {
    kinopoiskId: parsed.id,
    kinopoiskUrl: parsed.url,
    type: mediaType(schema, parsed.pathType),
    title,
    originalTitle: text(schema.alternativeHeadline) ?? text(schema.alternateName),
    year: number(schema.datePublished),
    description: text(schema.description),
    posterUrl: text(schema.image),
    durationSeconds: durationSeconds(schema),
    genres: list(schema.genre),
    countries: list(schema.countryOfOrigin),
    directors: people(schema.director),
    cast: people(schema.actor),
    rating: number(schema.aggregateRating?.ratingValue),
    ratingCount: number(schema.aggregateRating?.ratingCount),
    ageRating: text(schema.contentRating),
  };
}
