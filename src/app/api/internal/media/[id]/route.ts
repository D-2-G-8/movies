import type { Prisma } from "@prisma/client";
import { asInteger, apiError } from "@/lib/api";
import { db } from "@/lib/db";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json()) as Record<string, unknown>;
  const data: Prisma.MediaUpdateInput = {};
  if (body.title !== undefined) data.title = String(body.title).trim();
  if (body.type !== undefined) data.type = String(body.type);
  if (body.originalTitle !== undefined) data.originalTitle = body.originalTitle ? String(body.originalTitle) : null;
  if (body.year !== undefined) data.year = body.year ? asInteger(body.year) : null;
  if (body.enabled !== undefined) data.enabled = Boolean(body.enabled);
  if (body.description !== undefined) data.description = body.description ? String(body.description) : null;
  if (body.posterUrl !== undefined) data.posterUrl = body.posterUrl ? String(body.posterUrl) : null;
  if (body.kinopoiskId !== undefined) data.kinopoiskId = body.kinopoiskId ? String(body.kinopoiskId) : null;
  if (body.kinopoiskUrl !== undefined) data.kinopoiskUrl = body.kinopoiskUrl ? String(body.kinopoiskUrl) : null;
  if (body.genres !== undefined) data.genres = body.genres ? String(body.genres) : null;
  if (body.countries !== undefined) data.countries = body.countries ? String(body.countries) : null;
  if (body.directors !== undefined) data.directors = body.directors ? String(body.directors) : null;
  if (body.cast !== undefined) data.cast = body.cast ? String(body.cast) : null;
  if (body.rating !== undefined) data.rating = body.rating === null || body.rating === "" ? null : Number(body.rating);
  if (body.ratingCount !== undefined) data.ratingCount = body.ratingCount ? asInteger(body.ratingCount) : null;
  if (body.ageRating !== undefined) data.ageRating = body.ageRating ? String(body.ageRating) : null;
  if (body.seriesTitle !== undefined) data.seriesTitle = body.seriesTitle ? String(body.seriesTitle) : null;
  if (body.seasonNumber !== undefined) data.seasonNumber = body.seasonNumber ? asInteger(body.seasonNumber) : null;
  if (body.episodeNumber !== undefined) data.episodeNumber = body.episodeNumber ? asInteger(body.episodeNumber) : null;
  if (body.durationSeconds !== undefined) data.durationSeconds = Math.max(1, asInteger(body.durationSeconds));
  try {
    return Response.json(await db.media.update({ where: { id }, data }));
  } catch {
    return apiError("Контент не найден", 404);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await db.media.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch {
    return apiError("Контент не найден", 404);
  }
}
