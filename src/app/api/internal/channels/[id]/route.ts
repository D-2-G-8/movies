import type { Prisma } from "@prisma/client";
import { asInteger, apiError, slugify } from "@/lib/api";
import { db } from "@/lib/db";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json()) as Record<string, unknown>;
  const data: Prisma.ChannelUpdateInput = {};
  if (body.name !== undefined) data.name = String(body.name).trim();
  if (body.slug !== undefined) data.slug = slugify(String(body.slug));
  if (body.description !== undefined) data.description = body.description ? String(body.description) : null;
  if (body.accent !== undefined) data.accent = String(body.accent);
  if (body.enabled !== undefined) data.enabled = Boolean(body.enabled);
  if (body.playbackMode !== undefined) data.playbackMode = body.playbackMode === "RANDOM" ? "RANDOM" : "ORDERED";
  if (body.repeatDays !== undefined) data.repeatDays = Math.max(0, asInteger(body.repeatDays));
  if (body.interstitialCount !== undefined) data.interstitialCount = Math.max(0, asInteger(body.interstitialCount));
  if (body.useTrailers !== undefined) data.useTrailers = Boolean(body.useTrailers);
  if (body.useAds !== undefined) data.useAds = Boolean(body.useAds);
  if (body.interstitialMode !== undefined) data.interstitialMode = body.interstitialMode === "ORDERED" ? "ORDERED" : "RANDOM";
  if (body.interstitialRepeatDays !== undefined) data.interstitialRepeatDays = Math.max(0, asInteger(body.interstitialRepeatDays));
  try {
    return Response.json(await db.channel.update({ where: { id }, data }));
  } catch {
    return apiError("Channel not found or slug is already in use", 409);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await db.channel.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch {
    return apiError("Channel not found", 404);
  }
}
