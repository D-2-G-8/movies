import { asBoolean, asInteger, apiError } from "@/lib/api";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const media = await db.media.findMany({
    orderBy: { createdAt: "desc" },
    include: { sources: { orderBy: { priority: "desc" } }, channels: { include: { channel: true } } },
  });
  return Response.json(media);
}

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  const title = String(body.title ?? "").trim();
  const allowed = ["MOVIE", "SERIES", "EPISODE", "CARTOON"];
  const type = String(body.type ?? "MOVIE");
  if (!title) return apiError("Название обязательно");
  if (!allowed.includes(type)) return apiError("Неподдерживаемый тип контента");
  const nullableText = (value: unknown) => value ? String(value).trim() || null : null;
  const rating = body.rating === null || body.rating === undefined || body.rating === "" ? null : Number(body.rating);
  try {
    const media = await db.media.create({
      data: {
        title,
        type,
        originalTitle: nullableText(body.originalTitle),
        year: body.year ? asInteger(body.year) : null,
        enabled: asBoolean(body.enabled, true),
        description: nullableText(body.description),
        posterUrl: nullableText(body.posterUrl),
        kinopoiskId: nullableText(body.kinopoiskId),
        kinopoiskUrl: nullableText(body.kinopoiskUrl),
        genres: nullableText(body.genres),
        countries: nullableText(body.countries),
        directors: nullableText(body.directors),
        cast: nullableText(body.cast),
        rating: rating !== null && Number.isFinite(rating) ? rating : null,
        ratingCount: body.ratingCount ? asInteger(body.ratingCount) : null,
        ageRating: nullableText(body.ageRating),
        seriesTitle: nullableText(body.seriesTitle),
        seasonNumber: body.seasonNumber ? asInteger(body.seasonNumber) : null,
        episodeNumber: body.episodeNumber ? asInteger(body.episodeNumber) : null,
        durationSeconds: Math.max(1, asInteger(body.durationSeconds, 300)),
      },
    });
    return Response.json(media, { status: 201 });
  } catch {
    return apiError("Этот материал уже добавлен или данные заполнены неверно", 409);
  }
}
