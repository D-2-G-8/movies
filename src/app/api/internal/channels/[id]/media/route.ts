import { asBoolean, asInteger, apiError } from "@/lib/api";
import { db } from "@/lib/db";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: channelId } = await params;
  const body = (await request.json()) as Record<string, unknown>;
  const mediaId = String(body.mediaId ?? "");
  if (!mediaId) return apiError("mediaId is required");
  try {
    const item = await db.channelMedia.upsert({
      where: { channelId_mediaId: { channelId, mediaId } },
      create: {
        channelId,
        mediaId,
        position: asInteger(body.position, 0),
        weight: Math.max(1, asInteger(body.weight, 1)),
        enabled: asBoolean(body.enabled, true),
      },
      update: {
        position: asInteger(body.position, 0),
        weight: Math.max(1, asInteger(body.weight, 1)),
        enabled: asBoolean(body.enabled, true),
      },
    });
    return Response.json(item, { status: 201 });
  } catch {
    return apiError("Channel or media not found", 404);
  }
}
