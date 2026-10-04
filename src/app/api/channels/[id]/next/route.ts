import { apiError } from "@/lib/api";
import { advancePlayback } from "@/lib/playback";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const playback = await advancePlayback(id);
    return playback ? Response.json(playback) : apiError("Channel not found or disabled", 404);
  } catch {
    return apiError("Could not select the next item", 409);
  }
}
