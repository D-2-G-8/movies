import { db } from "@/lib/db";
import { apiError } from "@/lib/api";

const ruleFields = {
  playbackMode: true,
  repeatDays: true,
  interstitialCount: true,
  useTrailers: true,
  useAds: true,
  interstitialMode: true,
  interstitialRepeatDays: true,
} as const;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rules = await db.channel.findUnique({ where: { id }, select: ruleFields });
  return rules ? Response.json(rules) : apiError("Channel not found", 404);
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = (await request.json()) as Record<string, unknown>;
  try {
    const channel = await db.channel.update({
      where: { id },
      data: {
        playbackMode: body.playbackMode === "RANDOM" ? "RANDOM" : "ORDERED",
        repeatDays: Math.max(0, Number(body.repeatDays ?? 0)),
        interstitialCount: Math.max(0, Number(body.interstitialCount ?? 0)),
        useTrailers: Boolean(body.useTrailers),
        useAds: Boolean(body.useAds),
        interstitialMode: body.interstitialMode === "ORDERED" ? "ORDERED" : "RANDOM",
        interstitialRepeatDays: Math.max(0, Number(body.interstitialRepeatDays ?? 0)),
      },
      select: ruleFields,
    });
    return Response.json(channel);
  } catch {
    return apiError("Channel not found", 404);
  }
}
