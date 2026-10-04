import { asBoolean, asInteger, apiError } from "@/lib/api";
import { db } from "@/lib/db";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: mediaId } = await params;
  const body = (await request.json()) as Record<string, unknown>;
  const provider = String(body.provider ?? "DIRECT_URL").trim().toUpperCase();
  const streamUrl = body.streamUrl ? String(body.streamUrl).trim() : null;
  const iframeUrl = body.iframeUrl ? String(body.iframeUrl).trim() : null;
  const externalId = body.externalId ? String(body.externalId).trim() : null;
  if (!streamUrl && !iframeUrl && !externalId) return apiError("A stream URL, iframe URL or external ID is required");
  try {
    const source = await db.mediaSource.create({
      data: {
        mediaId,
        provider,
        streamUrl,
        iframeUrl,
        externalId,
        priority: asInteger(body.priority, 0),
        enabled: asBoolean(body.enabled, true),
      },
    });
    return Response.json(source, { status: 201 });
  } catch {
    return apiError("Media not found", 404);
  }
}
