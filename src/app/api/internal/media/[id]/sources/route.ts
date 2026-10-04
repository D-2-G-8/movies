import { asBoolean, asInteger, apiError } from "@/lib/api";
import { db } from "@/lib/db";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: mediaId } = await params;
  const body = (await request.json()) as Record<string, unknown>;
  const provider = String(body.provider ?? "DIRECT_URL").trim().toUpperCase();
  const streamUrl = body.streamUrl ? String(body.streamUrl).trim() : null;
  const iframeUrl = body.iframeUrl ? String(body.iframeUrl).trim() : null;
  if (!streamUrl && !iframeUrl) return apiError("A stream or iframe URL is required");
  try {
    const source = await db.mediaSource.create({
      data: {
        mediaId,
        provider,
        streamUrl,
        iframeUrl,
        externalId: body.externalId ? String(body.externalId) : null,
        priority: asInteger(body.priority, 0),
        enabled: asBoolean(body.enabled, true),
      },
    });
    return Response.json(source, { status: 201 });
  } catch {
    return apiError("Media not found", 404);
  }
}
