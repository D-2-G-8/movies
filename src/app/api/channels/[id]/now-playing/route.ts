import { apiError } from "@/lib/api";
import { getPlayback } from "@/lib/playback";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const playback = await getPlayback(id);
  return playback ? Response.json(playback) : apiError("Канал не найден или выключен", 404);
}
