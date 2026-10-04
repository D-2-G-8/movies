import { apiError } from "@/lib/api";
import { getPlayback } from "@/lib/playback";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const playback = await getPlayback(id);
    return playback ? Response.json(playback) : apiError("Channel not found or disabled", 404);
  } catch (error) {
    const message = error instanceof Error && error.message === "NO_PLAYABLE_CONTENT"
      ? "This channel has no playable content"
      : "Could not start playback";
    return apiError(message, 409);
  }
}
