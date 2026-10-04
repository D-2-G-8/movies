import type { Prisma } from "@prisma/client";
import { asInteger, apiError } from "@/lib/api";
import { db } from "@/lib/db";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json()) as Record<string, unknown>;
  const data: Prisma.MediaSourceUpdateInput = {};
  if (body.provider !== undefined) data.provider = String(body.provider).toUpperCase();
  if (body.externalId !== undefined) data.externalId = body.externalId ? String(body.externalId) : null;
  if (body.streamUrl !== undefined) data.streamUrl = body.streamUrl ? String(body.streamUrl) : null;
  if (body.iframeUrl !== undefined) data.iframeUrl = body.iframeUrl ? String(body.iframeUrl) : null;
  if (body.priority !== undefined) data.priority = asInteger(body.priority);
  if (body.enabled !== undefined) data.enabled = Boolean(body.enabled);
  try {
    return Response.json(await db.mediaSource.update({ where: { id }, data }));
  } catch {
    return apiError("Source not found", 404);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await db.mediaSource.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch {
    return apiError("Source not found", 404);
  }
}
