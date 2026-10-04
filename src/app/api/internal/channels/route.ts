import { asBoolean, asInteger, apiError, slugify } from "@/lib/api";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const channels = await db.channel.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      media: { orderBy: { position: "asc" }, include: { media: { include: { sources: { orderBy: { priority: "desc" } } } } } },
      ads: { orderBy: { position: "asc" }, include: { ad: true } },
      _count: { select: { history: true } },
    },
  });
  return Response.json(channels);
}

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  const name = String(body.name ?? "").trim();
  if (!name) return apiError("Name is required");
  try {
    const channel = await db.channel.create({
      data: {
        name,
        slug: slugify(String(body.slug ?? name)) || `channel-${Date.now()}`,
        description: body.description ? String(body.description) : null,
        accent: String(body.accent ?? "#d7ff64"),
        enabled: asBoolean(body.enabled, true),
        playbackMode: body.playbackMode === "RANDOM" ? "RANDOM" : "ORDERED",
        repeatDays: Math.max(0, asInteger(body.repeatDays, 7)),
        interstitialCount: Math.max(0, asInteger(body.interstitialCount, 1)),
        useTrailers: asBoolean(body.useTrailers, true),
        useAds: asBoolean(body.useAds, false),
        interstitialMode: body.interstitialMode === "ORDERED" ? "ORDERED" : "RANDOM",
        interstitialRepeatDays: Math.max(0, asInteger(body.interstitialRepeatDays, 3)),
      },
    });
    return Response.json(channel, { status: 201 });
  } catch {
    return apiError("A channel with this slug already exists", 409);
  }
}
