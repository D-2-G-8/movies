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
  if (!title) return apiError("Title is required");
  if (!allowed.includes(type)) return apiError("Unsupported media type");
  const media = await db.media.create({
    data: {
      title,
      type,
      year: body.year ? asInteger(body.year) : null,
      enabled: asBoolean(body.enabled, true),
      seriesTitle: body.seriesTitle ? String(body.seriesTitle) : null,
      seasonNumber: body.seasonNumber ? asInteger(body.seasonNumber) : null,
      episodeNumber: body.episodeNumber ? asInteger(body.episodeNumber) : null,
      durationSeconds: Math.max(1, asInteger(body.durationSeconds, 300)),
    },
  });
  return Response.json(media, { status: 201 });
}
