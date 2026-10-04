import type { Prisma } from "@prisma/client";
import { asInteger, apiError } from "@/lib/api";
import { db } from "@/lib/db";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json()) as Record<string, unknown>;
  const data: Prisma.AdUpdateInput = {};
  if (body.title !== undefined) data.title = String(body.title).trim();
  if (body.type !== undefined) data.type = body.type === "AD" ? "AD" : "TRAILER";
  if (body.videoUrl !== undefined) data.videoUrl = String(body.videoUrl).trim();
  if (body.enabled !== undefined) data.enabled = Boolean(body.enabled);
  if (body.durationSeconds !== undefined) data.durationSeconds = Math.max(1, asInteger(body.durationSeconds));
  try {
    return Response.json(await db.ad.update({ where: { id }, data }));
  } catch {
    return apiError("Реклама или трейлер не найдены", 404);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await db.ad.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch {
    return apiError("Реклама или трейлер не найдены", 404);
  }
}
