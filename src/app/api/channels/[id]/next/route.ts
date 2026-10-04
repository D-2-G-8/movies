import { apiError } from "@/lib/api";
import { advancePlayback } from "@/lib/playback";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const playback = await advancePlayback(id);
    return playback ? Response.json(playback) : apiError("Канал не найден или выключен", 404);
  } catch {
    return apiError("Не удалось выбрать следующую программу", 409);
  }
}
