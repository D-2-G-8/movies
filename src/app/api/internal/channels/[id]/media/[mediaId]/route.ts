import { asInteger, apiError } from "@/lib/api";
import { db } from "@/lib/db";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; mediaId: string }> }) {
  const { id: channelId, mediaId } = await params;
  const body = (await request.json()) as Record<string, unknown>;
  try {
    const item = await db.channelMedia.update({
      where: { channelId_mediaId: { channelId, mediaId } },
      data: {
        ...(body.position !== undefined && { position: asInteger(body.position) }),
        ...(body.weight !== undefined && { weight: Math.max(1, asInteger(body.weight)) }),
        ...(body.enabled !== undefined && { enabled: Boolean(body.enabled) }),
      },
    });
    return Response.json(item);
  } catch {
    return apiError("Контент не найден в расписании канала", 404);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; mediaId: string }> }) {
  const { id: channelId, mediaId } = await params;
  try {
    await db.channelMedia.delete({ where: { channelId_mediaId: { channelId, mediaId } } });
    return new Response(null, { status: 204 });
  } catch {
    return apiError("Контент не найден в расписании канала", 404);
  }
}
