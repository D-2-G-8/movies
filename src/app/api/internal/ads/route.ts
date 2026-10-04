import { asBoolean, asInteger, apiError } from "@/lib/api";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(
    await db.ad.findMany({ orderBy: { createdAt: "desc" }, include: { channels: { include: { channel: true } } } }),
  );
}

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  const title = String(body.title ?? "").trim();
  const videoUrl = String(body.videoUrl ?? "").trim();
  if (!title || !videoUrl) return apiError("Название и ссылка на видео обязательны");
  const ad = await db.ad.create({
    data: {
      title,
      videoUrl,
      type: body.type === "AD" ? "AD" : "TRAILER",
      enabled: asBoolean(body.enabled, true),
      durationSeconds: Math.max(1, asInteger(body.durationSeconds, 30)),
    },
  });
  return Response.json(ad, { status: 201 });
}
