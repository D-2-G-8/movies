import type { Prisma } from "@prisma/client";
import { asInteger, apiError } from "@/lib/api";
import { db } from "@/lib/db";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json()) as Record<string, unknown>;
  const data: Prisma.MediaUpdateInput = {};
  if (body.title !== undefined) data.title = String(body.title).trim();
  if (body.type !== undefined) data.type = String(body.type);
  if (body.year !== undefined) data.year = body.year ? asInteger(body.year) : null;
  if (body.enabled !== undefined) data.enabled = Boolean(body.enabled);
  if (body.seriesTitle !== undefined) data.seriesTitle = body.seriesTitle ? String(body.seriesTitle) : null;
  if (body.seasonNumber !== undefined) data.seasonNumber = body.seasonNumber ? asInteger(body.seasonNumber) : null;
  if (body.episodeNumber !== undefined) data.episodeNumber = body.episodeNumber ? asInteger(body.episodeNumber) : null;
  if (body.durationSeconds !== undefined) data.durationSeconds = Math.max(1, asInteger(body.durationSeconds));
  try {
    return Response.json(await db.media.update({ where: { id }, data }));
  } catch {
    return apiError("Media not found", 404);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await db.media.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch {
    return apiError("Media not found", 404);
  }
}
