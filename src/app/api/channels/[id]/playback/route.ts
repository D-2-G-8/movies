import { apiError } from "@/lib/api";
import { getPlayback } from "@/lib/playback";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const playback = await getPlayback(id);
    return playback ? Response.json(playback) : apiError("Канал не найден или выключен", 404);
  } catch (error) {
    const message = error instanceof Error && error.message === "NO_PLAYABLE_CONTENT"
      ? "На канале нет доступного для воспроизведения контента"
      : "Не удалось запустить воспроизведение";
    return apiError(message, 409);
  }
}
